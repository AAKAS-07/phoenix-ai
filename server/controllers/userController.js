const User = require('../models/User');

// @desc    Update user profile with avatar file upload
// @route   PUT /api/users/profile
const updateUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            if (req.body.firstName) user.firstName = req.body.firstName.trim();
            if (req.body.lastName) user.lastName = req.body.lastName.trim();
            if (req.body.phone) {
                const cleanPhone = req.body.phone.replace('+91', '');
                user.phone = '+91' + cleanPhone;
            }
            if (req.body.address !== undefined) {
                user.address = req.body.address.trim();
                if (user.address.length > 0) {
                    user.isProfileComplete = true;
                }
            }

            if (req.file) {
                user.avatar = '/uploads/' + req.file.filename;
            } else if (req.body.avatar && req.body.avatar.startsWith('data:')) {
                user.avatar = req.body.avatar;
            }

            const updatedUser = await user.save();

            res.json({
                success: true,
                _id: updatedUser._id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                phone: updatedUser.phone,
                address: updatedUser.address,
                avatar: updatedUser.avatar,
                isProfileComplete: updatedUser.isProfileComplete
            });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get user profile
// @route   GET /api/users/profile
const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    updateUserProfile,
    getUserProfile
};
