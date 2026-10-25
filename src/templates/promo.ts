import { wrapInHexacoreShell } from "./layout/emailShell";
import { EmailTemplateDefinition } from "@/lib/types";

export const promoTemplate: EmailTemplateDefinition = {
  id: "promo",
  name: "Special Promotion (50% Off)",
  category: "Onboarding",
  subject: "Special 50% Off Platform Developer Credits! 🎉",
  previewText: "Claim 50% discount on Hexacore Developer & Enterprise Cloud credits. Use voucher code HEXA50.",
  description: "Promotional campaign sent to active developers and enterprises for platform credit upgrades.",
  defaultParams: {
    userName: "Developer",
    discountCode: "HEXA50",
    discountPercent: "50%",
    cohortName: "Hexacore Production API Tier",
    expiresInDays: "5",
    enrollUrl: "http://localhost:3000/pricing",
  },
  generateHtml: (params) => {
    const {
      userName = "Developer",
      discountCode = "HEXA50",
      discountPercent = "50%",
      cohortName = "Hexacore Production API Tier",
      expiresInDays = "5",
      enrollUrl = "http://localhost:3000/pricing",
    } = params;

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
        Hello <strong>${userName}</strong>,
      </p>

      <p style="margin: 0 0 20px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
        Scale your fintech applications with Hexacore. We're pleased to offer you an exclusive <strong>${discountPercent} credit grant</strong> toward your next upgrade on the <strong>${cohortName}</strong>!
      </p>

      <!-- Promo Code Highlight Box -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 2px dashed #1a6fd4; border-radius: 12px; margin: 24px 0; text-align: center;">
        <tr>
          <td style="padding: 24px 16px;">
            <div style="font-size: 12px; font-weight: 700; color: #1a6fd4; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
              USE VOUCHER CODE AT CHECKOUT
            </div>
            <div style="font-size: 28px; font-weight: 900; color: #0d1f4a; letter-spacing: 4px; font-family: 'SF Mono', Consolas, Monaco, monospace; background: #ffffff; display: inline-block; padding: 10px 28px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(13, 31, 74, 0.06);">
              ${discountCode}
            </div>
            <div style="font-size: 13px; color: #64748b; margin-top: 10px; font-weight: 500;">
              ⚡ Offer expires in <strong>${expiresInDays} days</strong>. Valid for new and upgraded workspaces.
            </div>
          </td>
        </tr>
      </table>

      <!-- Benefits Checklist -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #1e293b;">
            ✔ <strong>700+ Microservices:</strong> High-throughput banking, credit underwriting, and settlement
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #1e293b;">
            ✔ <strong>Instant Sandbox Access:</strong> Provision dedicated test tenants in under 30 seconds
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #1e293b;">
            ✔ <strong>Enterprise SLA:</strong> 99.99% uptime with 24/7 dedicated solutions engineering support
          </td>
        </tr>
      </table>

      <!-- CTA Button (Primary brand gradient: Cyan to Blue) -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 20px;">
        <tr>
          <td align="center">
            <a href="${enrollUrl}" target="_blank" class="btn-grad" style="display: inline-block; background: linear-gradient(135deg, #00c8e8 0%, #1a6fd4 100%); color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 8px; box-shadow: 0 4px 16px rgba(26, 111, 212, 0.35);">
              Claim ${discountPercent} Off Credits &rarr;
            </a>
          </td>
        </tr>
      </table>

      <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b; line-height: 1.6;">
        Best regards,<br>
        <strong style="color: #0d1f4a;">The Hexacore Team</strong>
      </p>
    `;

    return wrapInHexacoreShell({
      previewText: `Special ${discountPercent} Off Credits! Use code ${discountCode}`,
      badge: "LIMITED TIME OFFER",
      title: "Unlock 50% Off Developer Credits",
      subtitle: "Accelerate your open banking roadmap with scalable cloud compute",
      contentHtml,
      footerNote: "You received this email because you are registered on Hexacore Open Finance Platform.",
    });
  },
};
