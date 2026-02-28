import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "banda <noreply@stayd-tools.com>";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });
}

export function inviteEmailHtml(inviteUrl: string, orgName: string, role: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You've been invited to ${orgName}</h2>
      <p>You've been invited to join <strong>${orgName}</strong> on banda as a <strong>${role}</strong>.</p>
      <p>Click the link below to accept the invitation:</p>
      <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
      <p style="color: #6b7280; font-size: 14px;">This invitation will expire in 7 days.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">banda by stayd &mdash; turnover photo documentation</p>
    </div>
  `;
}

export function verificationEmailHtml(verifyUrl: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify your email address</h2>
      <p>Please click the link below to verify your email address:</p>
      <p><a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Verify Email</a></p>
      <p style="color: #6b7280; font-size: 14px;">If you didn't create an account on banda, you can ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">banda by stayd &mdash; turnover photo documentation</p>
    </div>
  `;
}

export function passwordResetEmailHtml(resetUrl: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset your password</h2>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
      <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour. If you didn't request a password reset, you can ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">banda by stayd &mdash; turnover photo documentation</p>
    </div>
  `;
}
