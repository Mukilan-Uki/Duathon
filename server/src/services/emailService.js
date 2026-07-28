import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter;

function getTransporter() {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
  return transporter;
}

export async function sendOtpEmail({ to, name, code, purpose }) {
  const title = purpose === 'email_verification' ? 'Verify your email' : 'Reset your password';
  const mailer = getTransporter();

  if (!mailer) {
    if (env.NODE_ENV === 'development') {
      console.info(`[development email] ${title} for ${to}: ${code}`);
      return true;
    }
    console.error('SMTP is not configured; authentication email was not delivered.');
    return false;
  }

  await mailer.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: `${title} – Duothan Bank`,
    text: `Hello ${name},\n\nYour Duothan Bank security code is ${code}. It expires in ${env.OTP_EXPIRES_MINUTES} minutes.\n\nIf you did not request this, ignore this email.`,
  });
  return true;
}
