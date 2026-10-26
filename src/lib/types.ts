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

export interface BulkRecipient {
  email: string;
  name?: string;
  params?: Record<string, string>;
}

export interface CsvParseResult {
  recipients: BulkRecipient[];
  invalidRows: Array<{
    rowNumber: number;
    data: Record<string, string>;
    reason: string;
  }>;
  duplicates: string[];
  totalRows: number;
  validCount: number;
  headers: string[];
  detectedColumns: {
    emailCol?: string;
    nameCol?: string;
    customCols: string[];
  };
}

export interface BulkEmailPayload {
  recipients?: BulkRecipient[];
  csvContent?: string;
  subject: string;
  templateId?: TemplateType | "blank";
  params?: Record<string, string>;
  htmlContent?: string;
  audienceLabel?: string;
  batchSize?: number;
  dryRun?: boolean;
  deduplicate?: boolean;
}

export interface BulkBatchResult {
  batchIndex: number;
  recipientCount: number;
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkEmailResult {
  success: boolean;
  mode: 'live' | 'simulation';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  batchCount: number;
  invalidSkipped: number;
  campaignId?: string;
  results: BulkBatchResult[];
  errors?: string[];
  previewOnly?: boolean;
  recipients?: CampaignRecipient[];
}

export interface CampaignRecipient {
  email: string;
  name?: string;
  status?: "delivered" | "sent" | "failed" | "opened" | "clicked" | "bounced";
  deliveredAt?: string;
  opensCount?: number;
  clicksCount?: number;
  bounceReason?: string;
  metadata?: Record<string, string>;
}

