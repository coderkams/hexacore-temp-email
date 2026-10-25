import { wrapInHexacoreShell } from "./layout/emailShell";
import { EmailTemplateDefinition } from "@/lib/types";

export const announcementTemplate: EmailTemplateDefinition = {
  id: "announcement",
  name: "Platform Update Announcement",
  category: "Onboarding",
  subject: "Hexacore v2.4 Platform Release & API Upgrades 🚀",
  previewText: "Discover our new 700+ microservices and high-throughput transaction routing endpoints.",
  description: "Sent to announce new platform capabilities, dashboard updates, and tools.",
  defaultParams: {
    userName: "Alex Rivera",
    version: "v2.4",
    dashboardUrl: "http://localhost:3000/technology",
  },
  generateHtml: (params) => {
    const {
      userName = "Alex",
      version = "v2.4",
      dashboardUrl = "http://localhost:3000/technology",
    } = params;

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
        Hi <strong>${userName}</strong>,
      </p>

      <p style="margin: 0 0 20px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
        We have rolled out major architectural improvements to the Hexacore Open Finance Platform (Release ${version}). Check out what's newly available for your banking and fintech workflows:
      </p>

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px 0; padding: 8px;">
        <tr>
          <td style="padding: 14px 16px;">
            <div style="font-size: 15px; font-weight: 700; color: #0d1f4a; margin-bottom: 4px;">
              ⚡ 700+ Microservices Router
            </div>
            <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
              Sub-millisecond latency for card issuance, instant payouts, and cross-border SWIFT/SEPA gateways.
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 14px 16px; border-top: 1px solid #e2e8f0;">
            <div style="font-size: 15px; font-weight: 700; color: #0d1f4a; margin-bottom: 4px;">
              🛡️ Zero-Trust Credential Vault
            </div>
            <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
              Granular scoped API keys, automated rotation schedules, and HSM-backed key storage.
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 14px 16px; border-top: 1px solid #e2e8f0;">
            <div style="font-size: 15px; font-weight: 700; color: #0d1f4a; margin-bottom: 4px;">
              📊 Real-time Telemetry Dashboard
            </div>
            <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
              Inspect live transaction traces, mock endpoint responses, and simulate edge failure cases.
            </div>
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 20px;">
        <tr>
          <td align="center">
            <a href="${dashboardUrl}" target="_blank" class="btn-primary" style="display: inline-block; background-color: #0d1f4a; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 8px; box-shadow: 0 4px 14px rgba(13, 31, 74, 0.25);">
              Explore the Release in Console &rarr;
            </a>
          </td>
        </tr>
      </table>

      <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b; line-height: 1.6;">
        Happy building,<br>
        <strong style="color: #0d1f4a;">The Hexacore Platform Team</strong>
      </p>
    `;

    return wrapInHexacoreShell({
      previewText: "Exciting new platform updates on Hexacore Open Finance Platform",
      badge: "PLATFORM UPDATE",
      title: "Hexacore v2.4 Platform Upgrades Live",
      subtitle: "Discover high-throughput APIs and next-gen open finance infrastructure",
      contentHtml,
      footerNote: "You received this update because you are subscribed to platform notifications.",
    });
  },
};
