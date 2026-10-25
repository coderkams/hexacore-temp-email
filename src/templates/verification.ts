import { wrapInHexacoreShell } from "./layout/emailShell";
import { EmailTemplateDefinition } from "@/lib/types";

export const verificationTemplate: EmailTemplateDefinition = {
  id: "verification",
  name: "OTP Security Verification",
  category: "Authentication",
  subject: "Your Hexacore One-Time Security Code",
  previewText: "Use verification code to authorize your login to Hexacore Open Finance Platform.",
  description: "Sent during 2FA, passwordless login, or step-up authentication when accessing secure banking endpoints.",
  defaultParams: {
    userName: "Alex Rivera",
    otpCode: "749 203",
    expiresInMinutes: "10",
    ipAddress: "198.51.100.24",
    location: "San Francisco, CA, USA",
    device: "Chrome / macOS",
  },
  generateHtml: (params) => {
    const {
      userName = "Alex",
      otpCode = "749 203",
      expiresInMinutes = "10",
      ipAddress = "198.51.100.24",
      location = "San Francisco, CA, USA",
      device = "Chrome / macOS",
    } = params;

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
        Hi <strong>${userName}</strong>,
      </p>

      <p style="margin: 0 0 24px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
        We received a request to access your <strong>Hexacore</strong> developer account. Enter the verification code below to complete your authentication:
      </p>

      <!-- Prominent OTP Code Container -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px 0;">
        <tr>
          <td align="center" style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px 16px;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 1.5px; margin-bottom: 8px;">
              Your One-Time Passcode
            </div>
            <div style="font-family: 'SF Mono', Consolas, Menlo, Monaco, monospace; font-size: 36px; font-weight: 800; color: #0d1f4a; letter-spacing: 8px; margin: 4px 0;">
              ${otpCode}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
              Expires in <strong style="color: #0d1f4a;">${expiresInMinutes} minutes</strong>
            </div>
          </td>
        </tr>
      </table>

      <!-- Security Audit Details -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 0 0 20px 0;">
        <tr>
          <td style="padding: 14px 18px;">
            <div style="font-size: 12px; font-weight: 700; color: #0d1f4a; margin-bottom: 6px;">
              Request Details:
            </div>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 12px; color: #64748b;">
              <tr>
                <td style="padding: 3px 0; width: 80px;">Device:</td>
                <td style="padding: 3px 0; color: #1e293b; font-weight: 500;">${device}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0;">Location:</td>
                <td style="padding: 3px 0; color: #1e293b; font-weight: 500;">${location}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0;">IP Address:</td>
                <td style="padding: 3px 0; font-family: monospace; color: #1e293b;">${ipAddress}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
        If you did not initiate this authentication request, someone may be attempting to access your account. Please <a href="http://localhost:3000/security" style="color: #ef4444; font-weight: 600; text-decoration: underline;">lock your account immediately</a>.
      </p>
    `;

    return wrapInHexacoreShell({
      title: "Security Verification Code",
      previewText: `Your one-time code is ${otpCode}. Valid for ${expiresInMinutes} minutes.`,
      badge: "Security & Auth",
      subtitle: "Verify your identity to access Hexacore Open Finance Platform.",
      contentHtml,
      footerNote: "Hexacore will never ask for your verification code by phone, chat, or external email.",
    });
  },
};
