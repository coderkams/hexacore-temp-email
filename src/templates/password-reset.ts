import { wrapInHexacoreShell } from "./layout/emailShell";
import { EmailTemplateDefinition } from "@/lib/types";

export const passwordResetTemplate: EmailTemplateDefinition = {
  id: "password-reset",
  name: "Password Reset Request",
  category: "Authentication",
  subject: "Reset your Hexacore account password",
  previewText: "Instructions to securely reset your credentials on Hexacore Open Finance Platform.",
  description: "Sent when a user or administrator requests a password reset link.",
  defaultParams: {
    userName: "Alex Rivera",
    resetUrl: "http://localhost:3000/reset-password?token=sec_hex_8a39f1c7e4",
    expiresInHours: "2",
  },
  generateHtml: (params) => {
    const {
      userName = "Alex",
      resetUrl = "http://localhost:3000/reset-password?token=demo",
      expiresInHours = "2",
    } = params;

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
        Hi <strong>${userName}</strong>,
      </p>

      <p style="margin: 0 0 20px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
        We received a request to reset the password for your Hexacore Open Finance developer account. Click the button below to choose a new password:
      </p>

      <!-- Action Button -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
        <tr>
          <td align="center">
            <a href="${resetUrl}" target="_blank" class="btn-primary" style="display: inline-block; background-color: #0d1f4a; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 34px; border-radius: 8px; box-shadow: 0 4px 14px rgba(13, 31, 74, 0.25);">
              Reset Password &rarr;
            </a>
          </td>
        </tr>
      </table>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px 16px; margin: 0 0 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
          This link will expire in <strong>${expiresInHours} hours</strong> for security reasons. It can only be used once.
        </p>
      </div>

      <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
        Button not working? Copy and paste the link below into your browser:
      </p>
      <p style="margin: 0 0 20px 0; font-size: 12px; color: #1a6fd4; word-break: break-all; font-family: monospace;">
        <a href="${resetUrl}" style="color: #1a6fd4;">${resetUrl}</a>
      </p>

      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
        If you didn't request a password reset, you can safely ignore this email. Your password will not change until you access the link above and create a new one.
      </p>
    `;

    return wrapInHexacoreShell({
      title: "Password Reset Request",
      previewText: "Reset your Hexacore account password securely.",
      badge: "Account Access",
      subtitle: "Secure credential recovery for Hexacore Open Finance.",
      contentHtml,
      footerNote: "Always check that the URL begins with https://app.hexacore.io before entering credentials.",
    });
  },
};
