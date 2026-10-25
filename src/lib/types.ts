export type TemplateType = 
  | 'welcome' 
  | 'promo'
  | 'announcement'
  | 'verification' 
  | 'password-reset' 
  | 'api-key-created' 
  | 'team-invite';

export interface EmailTemplateDefinition {
  id: TemplateType;
  name: string;
  category: 'Onboarding' | 'Authentication' | 'Security' | 'Collaboration';
  subject: string;
  previewText: string;
  description: string;
  defaultParams: Record<string, string>;
  generateHtml: (params: Record<string, string>) => string;
}

export interface SendEmailPayload {
  toEmail: string;
  toName?: string;
  subject?: string;
  templateId?: TemplateType;
  params?: Record<string, string>;
  htmlContent?: string;
  audience?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  mode: 'live' | 'simulation';
  error?: string;
  details?: unknown;
}
