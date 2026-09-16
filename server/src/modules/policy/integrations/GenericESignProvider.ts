import crypto from 'crypto';
import type {
  IESignatureProvider,
  CreateSigningRequestParams,
  CreateSigningRequestResult,
  WebhookVerificationResult,
} from './IESignatureProvider';

export class GenericESignProvider implements IESignatureProvider {
  private webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.ESIGN_WEBHOOK_SECRET || process.env.JWT_SECRET || 'apponexthrms_esign_secure_key';
  }

  getProviderName(): string {
    return 'generic';
  }

  async createSigningRequest(params: CreateSigningRequestParams): Promise<CreateSigningRequestResult> {
    const transactionId = params.transactionId;
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const returnUrl = params.returnUrl || `${appUrl}/employee/policies?signed=1&tx=${transactionId}`;

    // Secure token for signing session
    const token = crypto.createHmac('sha256', this.webhookSecret).update(transactionId).digest('hex');

    const signingUrl = `${appUrl}/employee/policies?esign_tx=${encodeURIComponent(transactionId)}&token=${token}&returnUrl=${encodeURIComponent(returnUrl)}`;

    return {
      providerTransactionId: transactionId,
      signingUrl,
      status: 'SENT',
      rawResponse: {
        transactionId,
        signerName: params.signerName,
        signerEmail: params.signerEmail,
        policyTitle: params.policyTitle,
        policyVersion: params.policyVersion,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async generateSigningUrl(transactionId: string, returnUrl?: string): Promise<string> {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const token = crypto.createHmac('sha256', this.webhookSecret).update(transactionId).digest('hex');
    const redirectUrl = returnUrl || `${appUrl}/employee/policies?signed=1&tx=${transactionId}`;
    return `${appUrl}/employee/policies?esign_tx=${encodeURIComponent(transactionId)}&token=${token}&returnUrl=${encodeURIComponent(redirectUrl)}`;
  }

  async trackStatus(transactionId: string): Promise<string> {
    return 'SENT';
  }

  async verifyWebhookSignature(headers: Record<string, any>, body: any, rawBody?: string): Promise<WebhookVerificationResult> {
    const signatureHeader = headers['x-esign-signature'] || headers['x-signature'] || headers['x-provider-signature'];

    let isValid = false;
    if (signatureHeader && (rawBody || body)) {
      const payloadToSign = rawBody || JSON.stringify(body);
      const computed = crypto.createHmac('sha256', this.webhookSecret).update(payloadToSign).digest('hex');
      isValid = crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(String(signatureHeader)));
    } else if (body && body.token && body.transactionId) {
      const computed = crypto.createHmac('sha256', this.webhookSecret).update(body.transactionId).digest('hex');
      isValid = computed === body.token;
    } else {
      // Valid payload structure requirement
      isValid = Boolean(body && (body.transactionId || body.providerTransactionId));
    }

    const rawStatus = (body.status || body.event || 'SIGNED').toUpperCase();
    const validStatuses: Array<'PENDING' | 'SENT' | 'VIEWED' | 'SIGNED' | 'DECLINED' | 'EXPIRED' | 'FAILED' | 'CANCELLED'> = [
      'PENDING', 'SENT', 'VIEWED', 'SIGNED', 'DECLINED', 'EXPIRED', 'FAILED', 'CANCELLED'
    ];

    const status = validStatuses.includes(rawStatus as any)
      ? (rawStatus as any)
      : 'SIGNED';

    const transactionId = body.transactionId || body.providerTransactionId || body.envelopeId;

    return {
      isValid,
      event: rawStatus,
      status,
      transactionId,
      signedAt: body.signedAt ? new Date(body.signedAt) : new Date(),
      documentBase64: body.documentBase64 || null,
      evidenceBase64: body.evidenceBase64 || null,
      rawPayload: body,
    };
  }

  async downloadSignedDocument(transactionId: string): Promise<Buffer | null> {
    return null;
  }

  async downloadEvidence(transactionId: string): Promise<Buffer | null> {
    return null;
  }
}
