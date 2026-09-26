export interface CreateSigningRequestParams {
  transactionId: string;
  policyId: number;
  policyVersionId?: number | null;
  policyTitle: string;
  policyVersion: string;
  signerName: string;
  signerEmail: string;
  documentPathOrUrl: string;
  returnUrl?: string;
  metadata?: Record<string, any>;
}

export interface CreateSigningRequestResult {
  providerTransactionId: string;
  signingUrl: string;
  status: 'PENDING' | 'SENT';
  rawResponse?: Record<string, any>;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  event?: 'SIGNED' | 'DECLINED' | 'EXPIRED' | 'FAILED' | 'CANCELLED' | string;
  transactionId?: string;
  status?: 'PENDING' | 'SENT' | 'VIEWED' | 'SIGNED' | 'DECLINED' | 'EXPIRED' | 'FAILED' | 'CANCELLED';
  signedAt?: Date;
  documentBase64?: string;
  evidenceBase64?: string;
  rawPayload?: Record<string, any>;
}

export interface IESignatureProvider {
  getProviderName(): string;
  createSigningRequest(params: CreateSigningRequestParams): Promise<CreateSigningRequestResult>;
  generateSigningUrl(transactionId: string, returnUrl?: string): Promise<string>;
  trackStatus(transactionId: string): Promise<string>;
  verifyWebhookSignature(headers: Record<string, any>, body: any, rawBody?: string): Promise<WebhookVerificationResult>;
  downloadSignedDocument(transactionId: string): Promise<Buffer | null>;
  downloadEvidence(transactionId: string): Promise<Buffer | null>;
}
