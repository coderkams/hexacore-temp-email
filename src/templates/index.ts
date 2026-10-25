import { welcomeTemplate } from "./welcome";
import { promoTemplate } from "./promo";
import { announcementTemplate } from "./announcement";
import { verificationTemplate } from "./verification";
import { passwordResetTemplate } from "./password-reset";
import { apiKeyAlertTemplate } from "./api-key";
import { teamInviteTemplate } from "./team-invite";
import { EmailTemplateDefinition, TemplateType } from "@/lib/types";

export const templates: Record<TemplateType, EmailTemplateDefinition> = {
  welcome: welcomeTemplate,
  promo: promoTemplate,
  announcement: announcementTemplate,
  verification: verificationTemplate,
  "password-reset": passwordResetTemplate,
  "api-key-created": apiKeyAlertTemplate,
  "team-invite": teamInviteTemplate,
};

export const templateList: EmailTemplateDefinition[] = [
  promoTemplate,
  welcomeTemplate,
  announcementTemplate,
  verificationTemplate,
  passwordResetTemplate,
  apiKeyAlertTemplate,
  teamInviteTemplate,
];

export function getTemplateById(id: TemplateType): EmailTemplateDefinition {
  return templates[id] || welcomeTemplate;
}
