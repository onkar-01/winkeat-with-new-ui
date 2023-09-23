const nodeMailer = require("nodemailer");
const User = require("../models/userModel");
const bcryptjs = require("bcryptjs");

exports.sendEmail = async ({ email, emailType, userId }) => {
  try {
    // create a hased token
    const hashedToken = await bcryptjs.hash(userId.toString(), 10);

    if (emailType === "VERIFY") {
      await User.findByIdAndUpdate(userId, {
        verifyToken: hashedToken,
        verifyTokenExpiry: Date.now() + 3600000,
      });
    } else if (emailType === "RESET") {
      await User.findByIdAndUpdate(userId, {
        forgotPasswordToken: hashedToken,
        forgotPasswordTokenExpiry: Date.now() + 3600000,
      });
    }

    const transporter = nodeMailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject:
        emailType === "VERIFY" ? "Verify your email" : "Reset your password",
      html: `${
        emailType === "RESET"
          ? '<p>Click <a href="' +
            process.env.DOMAIN +
            "/auth/reset-password?token=" +
            hashedToken +
            '">here</a> to reset your password</p>'
          : '<p>Click <a href="' +
            process.env.DOMAIN +
            "/auth/verify-email?token=" +
            hashedToken +
            '">here</a> to verify your email</p>'
      }`,
    };

    const mailresponse = await transporter.sendMail(mailOptions);
    return mailresponse;
  } catch (error) {
    throw new Error(error.message);
  }
};
