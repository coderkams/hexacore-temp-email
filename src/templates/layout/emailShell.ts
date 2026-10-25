/**
 * Base Shell for Hexacore Transactional Emails
 * Designed to render consistently across Gmail, Apple Mail, Outlook 2016-365, and mobile web clients.
 * Uses the Hexacore Design System Color Palette:
 * --navy: #0d1f4a, --navy2: #091228, --blue: #1a6fd4, --cyan: #00c8e8
 * --text: #1e293b, --muted: #64748b, --light: #f8fafc, --border: #e2e8f0
 * --grad: linear-gradient(135deg, #00c8e8 0%, #1a6fd4 100%)
 */

export interface EmailShellOptions {
  previewText?: string;
  badge?: string;
  title: string;
  subtitle?: string;
  contentHtml: string;
  footerNote?: string;
}

export function wrapInHexacoreShell(options: EmailShellOptions): string {
  const {
    previewText = "Hexacore Open Finance notification",
    badge,
    title,
    subtitle,
    contentHtml,
    footerNote,
  } = options;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    :root {
      --navy:   #0d1f4a;
      --navy2:  #091228;
      --blue:   #1a6fd4;
      --cyan:   #00c8e8;
      --text:   #1e293b;
      --muted:  #64748b;
      --light:  #f8fafc;
      --border: #e2e8f0;
      --white:  #ffffff;
      --grad:   linear-gradient(135deg, #00c8e8 0%, #1a6fd4 100%);
    }

    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 100% !important;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Plus Jakarta Sans', Helvetica, Arial, sans-serif;
      color: #1e293b;
    }
    a { color: #1a6fd4; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .btn-primary:hover {
      background-color: #091228 !important;
    }
    .btn-grad:hover {
      opacity: 0.92 !important;
    }
    @media only screen and (max-width: 620px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .card-body {
        padding: 24px 20px !important;
      }
      .header-pad {
        padding: 24px 20px 16px !important;
      }
      .footer-pad {
        padding: 24px 20px !important;
      }
      .mobile-full {
        width: 100% !important;
        display: block !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text for inbox preview -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
    ${previewText}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; min-width: 100%;">
    <tr>
      <td align="center" style="padding: 36px 12px 48px;">
        <!-- Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 580px; margin: 0 auto; text-align: left;">
          
          <!-- Top Accent Gradient Line (Cyan to Blue) -->
          <tr>
            <td style="height: 4px; background: linear-gradient(135deg, #00c8e8 0%, #1a6fd4 100%); border-radius: 4px 4px 0 0;"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td class="header-pad" style="background-color: #ffffff; padding: 32px 36px 20px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <!-- Hexacore Logo & Wordmark -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px; width: 36px;">
                          <!-- High-Res Hexacore Mark Icon (White background) -->
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="36" height="36" style="border-collapse: separate; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <tr>
                              <td align="center" valign="middle" style="width: 36px; height: 36px; padding: 2px;">
                                <img src="https://hexacore.ng/images/hexacore.png" alt="Hexacore" width="32" height="32" style="display: block; width: 32px; height: 32px; border: 0; outline: none; text-decoration: none; border-radius: 6px;" />
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="vertical-align: middle;">
                          <span style="font-size: 21px; font-weight: 700; letter-spacing: -0.5px; color: #0d1f4a; display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            Hexacore
                          </span>
                          <span style="display: block; font-size: 11px; font-weight: 600; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase;">
                            Open Finance Platform
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: #f8fafc; color: #0d1f4a; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; border: 1px solid #e2e8f0;">
                      eHEX Platform
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card Content -->
          <tr>
            <td class="card-body" style="background-color: #ffffff; padding: 12px 36px 36px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(13, 31, 74, 0.04);">
              
              <!-- Optional Tag/Badge -->
              ${badge ? `
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; background-color: #f8fafc; color: #1a6fd4; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 12px; border: 1px solid #cbd5e1; letter-spacing: 0.3px; text-transform: uppercase;">
                  ${badge}
                </span>
              </div>` : ''}

              <!-- Title (Headings / Dark Text: #0d1f4a) -->
              <h1 style="margin: 0 0 10px 0; font-size: 23px; font-weight: 700; color: #0d1f4a; line-height: 1.3; letter-spacing: -0.3px;">
                ${title}
              </h1>

              <!-- Subtitle (Muted Text: #64748b) -->
              ${subtitle ? `
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #64748b; line-height: 1.5;">
                ${subtitle}
              </p>` : '<div style="margin-bottom: 20px;"></div>'}

              <!-- Body Injection -->
              ${contentHtml}

              <!-- Security Note / Disclaimer inside card -->
              ${footerNote ? `
              <div style="margin-top: 32px; padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                  <strong style="color: #0d1f4a;">Security Tip:</strong> ${footerNote}
                </p>
              </div>` : ''}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer-pad" style="padding: 28px 24px; text-align: center;">
              
              <!-- Quick Links (Primary link color: #1a6fd4) -->
              <p style="margin: 0 0 14px; font-size: 12px; color: #64748b; line-height: 1.6;">
                <a href="https://hexacore.io/docs" style="color: #1a6fd4; font-weight: 600; text-decoration: none;">Documentation</a>
                &nbsp;•&nbsp;
                <a href="https://hexacore.io/security" style="color: #1a6fd4; font-weight: 600; text-decoration: none;">Security & Trust</a>
                &nbsp;•&nbsp;
                <a href="https://hexacore.io/status" style="color: #1a6fd4; font-weight: 600; text-decoration: none;">API Status</a>
                &nbsp;•&nbsp;
                <a href="https://hexacore.io/support" style="color: #1a6fd4; font-weight: 600; text-decoration: none;">Help Center</a>
              </p>

              <!-- Legal Notice -->
              <p style="margin: 0 0 8px; font-size: 11px; color: #64748b; line-height: 1.5;">
                This transactional email was sent by Hexacore Open Finance Platform. You are receiving this because your email is registered on an active Hexacore workspace.
              </p>

              <!-- Copyright -->
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © 2026 Hexacore Inc. All rights reserved. Composable Open Finance for global banking & fintechs.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
