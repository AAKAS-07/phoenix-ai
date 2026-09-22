const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    register,
    login,
    getUser,
    updateProfile,
    forgotPassword,
    resetPassword,
    changePassword,
    verifyResetToken
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/user', authMiddleware, getUser);
router.put('/profile', authMiddleware, updateProfile);
router.post('/forgot-password', forgotPassword);
router.get('/reset-password/:token', verifyResetToken);
router.post('/reset-password/:token', resetPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authMiddleware, changePassword);
router.get('/verify-reset-token', verifyResetToken);
router.get('/verify-reset-token/:token', verifyResetToken);

router.get('/test-email', async (req, res) => {
  try {
    const { createTransporter } = require('../config/nodemailer');
    const transporter = createTransporter();
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const info = await transporter.sendMail({
      from: `"Smart Agriculture" <${smtpUser}>`,
      to: smtpUser,
      subject: "SMTP Test Email",
      text: "SMTP is working correctly."
    });

    console.log("EMAIL SENT:", info);

    res.json({
      success: true,
      message: "Test email sent",
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });
  } catch (error) {
    console.error("EMAIL ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Email failed",
      error: error.message
    });
  }
});


module.exports = router;
