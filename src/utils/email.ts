import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  secure: true,
  host: "smtp.gmail.com",
  port: 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Enhanced email sending function
export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) => {
  try {
    await transporter.sendMail({
      from: `AI-Powered <CLIENT SUPPORT>`,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
};

export const sendPasswordResetEmail = async (
  to: string,
  resetCode: string
): Promise<boolean> => {
  const subject = "Password Reset Request";
  const text = `Your password reset code is: ${resetCode}. This code will expire in 1 hour.`;
  const html = `
    <h1>Password Reset Request</h1>
    <p>Your password reset code is: <strong>${resetCode}</strong></p>
    <p>This code will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  return sendEmail({ to, subject, text, html });
};
