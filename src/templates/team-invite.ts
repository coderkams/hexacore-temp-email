import { wrapInHexacoreShell } from "./layout/emailShell";
import { EmailTemplateDefinition } from "@/lib/types";

export const teamInviteTemplate: EmailTemplateDefinition = {
  id: "team-invite",
  name: "Workspace Team Invitation",
  category: "Collaboration",
  subject: "Elena Rostova invited you to join Apex Financial Global on Hexacore",
  previewText: "Join your team on Hexacore to collaborate on open finance banking APIs and microservices.",
  description: "Sent when an organization admin invites engineers or operators to join a workspace.",
  defaultParams: {
    userName: "Alex Rivera",
    inviterName: "Elena Rostova",
    inviterRole: "Head of Core Banking",
    organizationName: "Apex Financial Global",
    role: "Senior Solutions Architect",
    inviteUrl: "http://localhost:3000/login?action=invite",
  },
  generateHtml: (params) => {
    const {
      userName = "Alex",
      inviterName = "Elena Rostova",
      inviterRole = "Head of Core Banking",
      organizationName = "Apex Financial Global",
      role = "Senior Solutions Architect",
      inviteUrl = "http://localhost:3000/login?action=invite",
    } = params;

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
        Hi <strong>${userName}</strong>,
      </p>

      <p style="margin: 0 0 20px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
        <strong>${inviterName}</strong> (${inviterRole}) has invited you to collaborate in the <strong>${organizationName}</strong> workspace on <strong>Hexacore</strong>.
      </p>

      <!-- Invitation Card Summary -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 0 24px 0;">
        <tr>
          <td style="padding: 20px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 110px;">Organization:</td>
                <td style="padding: 6px 0; color: #0d1f4a; font-weight: 700; font-size: 14px;">${organizationName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Assigned Role:</td>
                <td style="padding: 6px 0;">
                  <span style="display: inline-block; background-color: #ffffff; color: #1a6fd4; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 6px; border: 1px solid #cbd5e1;">
                    ${role}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Invited By:</td>
                <td style="padding: 6px 0; color: #0d1f4a;">${inviterName}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Action Button -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 20px;">
        <tr>
          <td align="center">
            <a href="${inviteUrl}" target="_blank" class="btn-primary" style="display: inline-block; background-color: #0d1f4a; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 34px; border-radius: 8px; box-shadow: 0 4px 14px rgba(13, 31, 74, 0.25);">
              Accept Invitation &amp; Join Team &rarr;
            </a>
          </td>
        </tr>
      </table>

      <p style="margin: 0; font-size: 13px; color: #64748b; text-align: center;">
        This invitation will expire in 7 days. If you do not recognize this organization, you can safely ignore this email.
      </p>
    `;

    return wrapInHexacoreShell({
      title: "Team Workspace Invitation",
      previewText: `${inviterName} invited you to join ${organizationName} on Hexacore.`,
      badge: "Team Collaboration",
      subtitle: "Join your team to build and configure core banking microservices.",
      contentHtml,
      footerNote: "You will have access to workspace APIs, sandbox environments, and test credentials.",
    });
  },
};
