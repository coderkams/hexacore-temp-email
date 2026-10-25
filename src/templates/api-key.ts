import { wrapInHexacoreShell } from "./layout/emailShell";
import { EmailTemplateDefinition } from "@/lib/types";

export const apiKeyAlertTemplate: EmailTemplateDefinition = {
  id: "api-key-created",
  name: "New API Key Generated",
  category: "Security",
  subject: "[Security Alert] New Production API Key generated in Hexacore",
  previewText: "A new live API key has been provisioned on your Hexacore workspace.",
  description: "Mandatory compliance alert sent when an engineer or admin creates or rotates an API credential.",
  defaultParams: {
    userName: "Alex Rivera",
    keyName: "Core Banking Microservices Prod",
    keyPrefix: "hex_live_9f83a...41b0",
    environment: "Live Production (eHEX Cluster 01)",
    createdBy: "alex.rivera@enterprise-bank.com",
    createdDate: "October 24, 2026 17:35 UTC",
    dashboardUrl: "http://localhost:3000/technology",
  },
  generateHtml: (params) => {
    const {
      userName = "Alex",
      keyName = "Core Banking Microservices Prod",
      keyPrefix = "hex_live_9f83a...41b0",
      environment = "Live Production",
      createdBy = "alex.rivera@enterprise-bank.com",
      createdDate = "October 24, 2026 17:35 UTC",
      dashboardUrl = "http://localhost:3000/technology",
    } = params;

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
        Hi <strong>${userName}</strong>,
      </p>

      <p style="margin: 0 0 20px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
        This is an automated security notice to inform you that a new API credential has been generated in your Hexacore organization:
      </p>

      <!-- Key Metadata Card -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 0 24px 0;">
        <tr>
          <td style="padding: 18px 20px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 120px;">Key Label:</td>
                <td style="padding: 6px 0; color: #0d1f4a; font-weight: 700;">${keyName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Key Identifier:</td>
                <td style="padding: 6px 0; font-family: monospace; color: #1a6fd4; font-weight: 600;">${keyPrefix}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Environment:</td>
                <td style="padding: 6px 0;">
                  <span style="display: inline-block; background-color: #ecfdf5; color: #059669; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; border: 1px solid #a7f3d0;">
                    ${environment}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Created By:</td>
                <td style="padding: 6px 0; color: #0d1f4a;">${createdBy}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Timestamp:</td>
                <td style="padding: 6px 0; color: #0d1f4a;">${createdDate}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Security Guidance -->
      <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px 16px; margin: 0 0 24px 0;">
        <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.5;">
          <strong>Security Warning:</strong> API keys grant programmatic access to your banking core and financial services. Never commit keys to public GitHub repositories or client-side frontends.
        </p>
      </div>

      <!-- Action Button -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
        <tr>
          <td align="center">
            <a href="${dashboardUrl}" target="_blank" class="btn-primary" style="display: inline-block; background-color: #0d1f4a; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 14px rgba(13, 31, 74, 0.2);">
              Manage &amp; Revoke Keys &rarr;
            </a>
          </td>
        </tr>
      </table>
    `;

    return wrapInHexacoreShell({
      title: "New API Key Provisioned",
      previewText: `Production API Key '${keyName}' was created in your Hexacore organization.`,
      badge: "Security Compliance",
      subtitle: "Audit log notification for Hexacore developer credentials.",
      contentHtml,
      footerNote: "If you did not authorize this key generation, immediately revoke it in the Hexacore console.",
    });
  },
};
