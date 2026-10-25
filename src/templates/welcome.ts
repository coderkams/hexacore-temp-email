import { wrapInHexacoreShell } from "./layout/emailShell";
import { EmailTemplateDefinition } from "@/lib/types";

export const welcomeTemplate: EmailTemplateDefinition = {
  id: "welcome",
  name: "Welcome to Hexacore",
  category: "Onboarding",
  subject: "Welcome to Hexacore — The Composable Open Finance Platform",
  previewText: "Your enterprise open finance workspace is ready. Access 700+ microservices and 3,000+ banking APIs.",
  description: "Sent to new developers, enterprise banking architects, and partners after creating an account.",
  defaultParams: {
    userName: "Alex Rivera",
    userRole: "Lead Banking Architect",
    workspaceName: "Apex FinTech Core",
    loginUrl: "http://localhost:3000/login",
    docsUrl: "http://localhost:3000/documentation",
  },
  generateHtml: (params) => {
    const {
      userName = "Alex",
      workspaceName = "Your Workspace",
      loginUrl = "http://localhost:3000/login",
      docsUrl = "http://localhost:3000/documentation",
    } = params;

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
        Hi <strong>${userName}</strong>,
      </p>

      <p style="margin: 0 0 20px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
        Welcome to <strong>Hexacore</strong>. Your enterprise banking workspace <strong>${workspaceName}</strong> has been provisioned and is ready for integration.
      </p>

      <!-- Key Metrics Banner -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px 0 24px;">
        <tr>
          <td style="padding: 16px; text-align: center; border-right: 1px solid #e2e8f0; width: 33.3%;">
            <div style="font-size: 18px; font-weight: 700; color: #1a6fd4;">700+</div>
            <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-top: 2px;">Microservices</div>
          </td>
          <td style="padding: 16px; text-align: center; border-right: 1px solid #e2e8f0; width: 33.3%;">
            <div style="font-size: 18px; font-weight: 700; color: #1a6fd4;">3,061</div>
            <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-top: 2px;">Open APIs</div>
          </td>
          <td style="padding: 16px; text-align: center; width: 33.3%;">
            <div style="font-size: 18px; font-weight: 700; color: #00c8e8;">99.99%</div>
            <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-top: 2px;">SLA Uptime</div>
          </td>
        </tr>
      </table>

      <!-- Next Steps Checklist -->
      <div style="margin-bottom: 24px;">
        <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #0d1f4a; text-transform: uppercase; letter-spacing: 0.5px;">
          Next steps to get started:
        </p>

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding: 8px 0; vertical-align: top; width: 24px;">
              <span style="display: inline-block; width: 20px; height: 20px; background: #f8fafc; color: #1a6fd4; border: 1px solid #cbd5e1; border-radius: 50%; text-align: center; line-height: 18px; font-size: 11px; font-weight: 700;">1</span>
            </td>
            <td style="padding: 8px 0 8px 8px; vertical-align: top;">
              <strong style="color: #0d1f4a; font-size: 14px;">Sign in to your console:</strong>
              <div style="font-size: 13px; color: #64748b; margin-top: 2px;">Access the real-time core banking and originations dashboard.</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; vertical-align: top; width: 24px;">
              <span style="display: inline-block; width: 20px; height: 20px; background: #f8fafc; color: #1a6fd4; border: 1px solid #cbd5e1; border-radius: 50%; text-align: center; line-height: 18px; font-size: 11px; font-weight: 700;">2</span>
            </td>
            <td style="padding: 8px 0 8px 8px; vertical-align: top;">
              <strong style="color: #0d1f4a; font-size: 14px;">Generate Sandbox Keys:</strong>
              <div style="font-size: 13px; color: #64748b; margin-top: 2px;">Test lending origination, card issuing, and instant settlement flows.</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; vertical-align: top; width: 24px;">
              <span style="display: inline-block; width: 20px; height: 20px; background: #f8fafc; color: #1a6fd4; border: 1px solid #cbd5e1; border-radius: 50%; text-align: center; line-height: 18px; font-size: 11px; font-weight: 700;">3</span>
            </td>
            <td style="padding: 8px 0 8px 8px; vertical-align: top;">
              <strong style="color: #0d1f4a; font-size: 14px;">Explore API Documentation:</strong>
              <div style="font-size: 13px; color: #64748b; margin-top: 2px;">Interactive OpenAPI specs with SDKs for TypeScript, Python, and Go.</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Action Button (Hexacore Navy #0d1f4a) -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 20px;">
        <tr>
          <td align="center">
            <a href="${loginUrl}" target="_blank" class="btn-primary" style="display: inline-block; background-color: #0d1f4a; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(13, 31, 74, 0.25);">
              Launch Developer Console &rarr;
            </a>
          </td>
        </tr>
      </table>

      <!-- Secondary Link -->
      <p style="margin: 0; font-size: 13px; color: #64748b; text-align: center;">
        Need architectural guidance? Explore our <a href="${docsUrl}" style="color: #1a6fd4; font-weight: 600; text-decoration: underline;">Architecture Docs</a>.
      </p>
    `;

    return wrapInHexacoreShell({
      title: "Welcome to Hexacore Open Finance",
      previewText: "Your enterprise banking workspace has been provisioned.",
      badge: "Onboarding",
      subtitle: "The #1 composable Open Finance Platform for modern banks and fintechs.",
      contentHtml,
      footerNote: "Never share your developer keys or passwords with anyone. Hexacore staff will never ask for your credentials.",
    });
  },
};
