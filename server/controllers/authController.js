const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const { sendResetEmail } = require('../config/nodemailer');

const resetRateLimitMap = new Map();

const isRateLimited = (identifier) => {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes window
    const maxRequests = 5;

    const record = resetRateLimitMap.get(identifier);
    if (!record) {
        resetRateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
        return false;
    }

    if (now > record.resetAt) {
        resetRateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
        return false;
    }

    if (record.count >= maxRequests) {
        return true;
    }

    record.count += 1;
    return false;
};

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'phoenixai_secret_key_2024', {
        expiresIn: '30d'
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
const register = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, phone, gender } = req.body;

        if (!firstName || !lastName || !email || !password || !phone || !gender) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
            });
        }

        if (!['Male', 'Female'].includes(gender)) {
            return res.status(400).json({ message: 'Gender must be Male or Female' });
        }

        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
        }

        const fullPhone = '+91' + phone;

        const emailExists = await User.findOne({ email: email.toLowerCase() });
        if (emailExists) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const phoneExists = await User.findOne({ phone: fullPhone });
        if (phoneExists) {
            return res.status(400).json({ message: 'User already exists with this phone number' });
        }

        const user = await User.create({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password,
            phone: fullPhone,
            gender,
            address: '',
            isProfileComplete: false
        });

        if (user) {
            res.status(201).json({
                message: 'Account created successfully!',
                success: true
            });
        }
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            if (field === 'email') {
                return res.status(400).json({ message: 'User already exists with this email' });
            } else if (field === 'phone') {
                return res.status(400).json({ message: 'User already exists with this phone number' });
            }
        }
        next(error);
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'Please provide valid email and password' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (user && user.password && (await user.comparePassword(password))) {
            const isProfileComplete = Boolean(user.address && user.address.trim().length > 0);

            res.json({
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone || '',
                address: user.address || '',
                avatar: user.avatar || '',
                isProfileComplete: isProfileComplete,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        next(error);
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/user
const getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
    try {
        const { firstName, lastName, phone, address, avatar } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (firstName) user.firstName = firstName.trim();
        if (lastName) user.lastName = lastName.trim();

        if (phone) {
            const cleanPhone = phone.replace('+91', '');
            const phoneRegex = /^\d{10}$/;
            if (!phoneRegex.test(cleanPhone)) {
                return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
            }
            const fullPhone = '+91' + cleanPhone;
            const phoneExists = await User.findOne({ phone: fullPhone, _id: { $ne: user._id } });
            if (phoneExists) {
                return res.status(400).json({ message: 'This phone number is already in use' });
            }
            user.phone = fullPhone;
        }

        if (address !== undefined) user.address = address.trim();
        if (avatar) user.avatar = avatar;

        if (user.address && user.address.trim().length > 0) {
            user.isProfileComplete = true;
        }

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            address: user.address,
            avatar: user.avatar,
            isProfileComplete: user.isProfileComplete
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'This phone number is already in use' });
        }
        next(error);
    }
};

// @desc    Forgot password email trigger
// @route   POST /api/auth/forgot-password & /auth/forgot-password
const forgotPassword = async (req, res, next) => {
    try {
        console.log('[RESET] Forgot password request received');
        const { email: rawEmail } = req.body || {};

        if (!rawEmail || typeof rawEmail !== 'string' || !/\S+@\S+\.\S+/.test(rawEmail.trim())) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        }

        const email = rawEmail.trim().toLowerCase();

        const clientIp = req.ip || req.headers['x-forwarded-for'] || email;
        if (isRateLimited(clientIp)) {
            return res.status(429).json({
                success: false,
                message: 'Too many password reset requests. Please wait 15 minutes before trying again.'
            });
        }

        // Validate if email exists in database
        const user = await User.findOne({ email });

        if (!user) {
            console.log('[RESET] User found: false');
            return res.status(404).json({
                success: false,
                message: 'Email address is not registered.'
            });
        }

        console.log('[RESET] User found: true');

        // Generate cryptographically secure random token (raw to email, hashed to database)
        const rawResetToken = crypto.randomBytes(32).toString('hex');
        console.log('[RESET] Reset token generated');
        const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');

        // 30 Minutes Expiry
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        // Update User schema fields
        user.resetPasswordToken = hashedResetToken;
        user.resetPasswordExpires = expiresAt;
        user.resetToken = hashedResetToken;
        user.resetTokenExpiry = expiresAt;
        user.resetTokenCreatedAt = new Date();
        user.resetTokenUsed = false;
        user.resetTokenUsedAt = null;
        await user.save();

        console.log('[RESET] Reset token stored');

        // Invalidate previous active tokens in PasswordResetToken model & create new one
        await PasswordResetToken.updateMany(
            { userId: user._id, used: false },
            { $set: { used: true, usedAt: new Date() } }
        );

        await PasswordResetToken.create({
            userId: user._id,
            hashedToken: hashedResetToken,
            expiresAt: expiresAt,
            createdAt: new Date(),
            used: false,
            usedAt: null
        });

        // Send Email with unhashed raw token
        const mailResult = await sendResetEmail(user.email, rawResetToken);

        if (!mailResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Unable to send the reset email. Please try again.'
            });
        }

        console.log('[RESET] Reset email sent');

        res.status(200).json({
            success: true,
            message: 'Password reset link sent to your email address.'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify reset token
// @route   GET /api/auth/reset-password/:token & /api/auth/verify-reset-token/:token
const verifyResetToken = async (req, res, next) => {
    try {
        console.log('[RESET] Token validation requested');
        const rawToken = req.params.token || req.query.token;

        if (!rawToken) {
            return res.status(400).json({ valid: false, success: false, message: 'Password reset link is invalid or has expired.' });
        }

        const hashedResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        // Find user by resetPasswordToken/resetToken and verify expiration and un-used status
        let user = await User.findOne({
            $or: [
                { resetPasswordToken: hashedResetToken, resetPasswordExpires: { $gt: new Date() } },
                { resetToken: hashedResetToken, resetTokenUsed: false, resetTokenExpiry: { $gt: new Date() } }
            ]
        });

        if (!user) {
            console.log('[RESET] Token valid: false');
            return res.status(400).json({
                valid: false,
                success: false,
                message: 'Password reset link is invalid or has expired.'
            });
        }

        console.log('[RESET] Token valid: true');

        res.status(200).json({
            valid: true,
            success: true,
            email: user.email,
            firstName: user.firstName
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token & POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
    try {
        const token = req.params.token || req.body.token;
        const { password, confirmPassword, newPassword } = req.body || {};
        const targetPassword = newPassword || password;

        if (!token || !targetPassword) {
            return res.status(400).json({ success: false, message: 'Please provide reset token and new password.' });
        }

        if (confirmPassword && targetPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match.' });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if (!passwordRegex.test(targetPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
            });
        }

        const hashedResetToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with matching token and valid expiry
        let user = await User.findOne({
            $or: [
                { resetPasswordToken: hashedResetToken, resetPasswordExpires: { $gt: new Date() } },
                { resetToken: hashedResetToken, resetTokenUsed: false, resetTokenExpiry: { $gt: new Date() } }
            ]
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Password reset link is invalid or has expired.'
            });
        }

        // Update User password (pre save hook in User model will hash it with bcrypt)
        user.password = targetPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.resetToken = null;
        user.resetTokenExpiry = null;
        user.resetTokenCreatedAt = null;
        user.resetTokenUsed = true;
        user.resetTokenUsedAt = new Date();
        await user.save();

        // Mark tokens as used in PasswordResetToken table
        await PasswordResetToken.updateMany(
            { userId: user._id },
            { $set: { used: true, usedAt: new Date() } }
        );

        console.log('[RESET] Password reset successful');

        res.status(200).json({
            success: true,
            message: 'Password reset successfully.'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Change password
// @route   POST /api/auth/change-password
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body || {};

        if (!currentPassword || !currentPassword.trim()) {
            return res.status(400).json({ success: false, message: 'Current password is required.' });
        }

        if (!newPassword || !newPassword.trim()) {
            return res.status(400).json({ success: false, message: 'Please meet all password requirements.' });
        }

        if (confirmPassword && newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
            });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({
            message: 'Password updated successfully!',
            success: true
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    getUser,
    updateProfile,
    forgotPassword,
    resetPassword,
    changePassword,
    verifyResetToken
};
