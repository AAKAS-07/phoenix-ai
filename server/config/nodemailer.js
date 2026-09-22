const nodemailer = require('nodemailer');

const createTransporter = () => {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

    console.log("SMTP host configured:", !!host);
    console.log("SMTP user configured:", !!user);
    console.log("SMTP password configured:", !!pass);

    return nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: {
            user,
            pass
        }
    });
};

const verifyTransporter = (transporterToVerify) => {
    const transporter = transporterToVerify || createTransporter();
    transporter.verify((error, success) => {
        if (error) {
            console.error("SMTP connection failed:", error.message);
        } else {
            console.log("SMTP server ready");
        }
    });
};

const sendResetEmail = async (email, arg2, arg3) => {
    try {
        const rawResetToken = arg3 || arg2;
        const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
        const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${clientUrl.replace(/\/+$/, '')}/reset-password/${rawResetToken}`;

        const transporter = createTransporter();

        const mailOptions = {
            from: `"Smart Agriculture" <${smtpUser}>`,
            to: email,
            replyTo: smtpUser,
            subject: "Reset Your Smart Agriculture Password",

            text: `Hello,

We received a request to reset your Smart Agriculture account password.

Reset your password using this link:

${resetUrl}

This password reset link will expire in 30 minutes.

If you did not request this password reset, you can safely ignore this email.

Regards,
Smart Agriculture Team`,

            html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reset Your Password</title>
</head>

<body style="font-family: Arial, sans-serif;">

  <h2>Reset Your Password</h2>

  <p>Hello,</p>

  <p>
    We received a request to reset your Smart Agriculture account password.
  </p>

  <p>
    Click the button below to create a new password.
  </p>

  <p>
    <a
      href="${resetUrl}"
      style="
        display:inline-block;
        padding:12px 20px;
        background:#166534;
        color:#ffffff;
        text-decoration:none;
        border-radius:6px;
      "
    >
      Reset Password
    </a>
  </p>

  <p>
    This password reset link will expire in 30 minutes.
  </p>

  <p>
    If you did not request this password reset,
    you can safely ignore this email.
  </p>

  <p>
    Regards,<br>
    Smart Agriculture Team
  </p>

</body>
</html>`
        };

        const info = await transporter.sendMail(mailOptions);

        console.log("✅ Password reset email sent");
        console.log("Message ID:", info.messageId);
        console.log("Accepted:", info.accepted);
        console.log("Rejected:", info.rejected);

        return { success: true, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
    } catch (error) {
        console.error('Error sending reset email (SMTP failed):', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = { createTransporter, verifyTransporter, sendResetEmail };
