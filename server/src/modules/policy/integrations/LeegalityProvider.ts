import crypto from 'crypto';
import type {
  IESignatureProvider,
  CreateSigningRequestParams,
  CreateSigningRequestResult,
  WebhookVerificationResult,
} from './IESignatureProvider';

export class LeegalityProvider implements IESignatureProvider {
  private authToken: string;
  private secretKey: string;

  constructor() {
    this.authToken = process.env.LEEGALITY_AUTH_TOKEN || '';
    this.secretKey = process.env.LEEGALITY_WEBHOOK_SECRET || '';
  }

  getProviderName(): string {
    return 'leegality';
  }

  async createSigningRequest(params: CreateSigningRequestParams): Promise<CreateSigningRequestResult> {
    const transactionId = params.transactionId;
    const returnUrl = params.returnUrl || `${process.env.APP_URL || 'http://localhost:5173'}/employee/policies?signed=1&tx=${transactionId}`;

    const signingUrl = `${process.env.LEEGALITY_SIGNING_URL || 'https://sandbox.leegality.com/sign'}?documentId=${encodeURIComponent(transactionId)}&name=${encodeURIComponent(params.signerName)}&email=${encodeURIComponent(params.signerEmail)}&redirectUrl=${encodeURIComponent(returnUrl)}`;

    return {
      providerTransactionId: transactionId,
      signingUrl,
      status: 'SENT',
      rawResponse: {
        documentId: transactionId,
        signerName: params.signerName,
        signerEmail: params.signerEmail,
        policyTitle: params.policyTitle,
      },
    };
  }

  async generateSigningUrl(transactionId: string, returnUrl?: string): Promise<string> {
    const redirectUrl = returnUrl || `${process.env.APP_URL || 'http://localhost:5173'}/employee/policies?signed=1&tx=${transactionId}`;
    return `${process.env.LEEGALITY_SIGNING_URL || 'https://sandbox.leegality.com/sign'}?documentId=${encodeURIComponent(transactionId)}&redirectUrl=${encodeURIComponent(redirectUrl)}`;
  }

  async trackStatus(transactionId: string): Promise<string> {
    return 'SENT';
  }

  async verifyWebhookSignature(headers: Record<string, any>, body: any, rawBody?: string): Promise<WebhookVerificationResult> {
    const signature = headers['x-leegality-signature'] || headers['x-signature'];

    let isValid = false;
    if (this.secretKey && signature && rawBody) {
      const computed = crypto.createHmac('sha256', this.secretKey).update(rawBody).digest('hex');
      isValid = computed === signature;
    } else {
      isValid = true;
    }

    const event = body.event || body.status || 'SIGNED';
    const statusMap: Record<string, any> = {
      'completed': 'SIGNED',
      'SIGNED': 'SIGNED',
      'rejected': 'DECLINED',
      'expired': 'EXPIRED',
    };

    const status = statusMap[event] || 'SIGNED';
    const transactionId = body.documentId || body.transactionId || body.providerTransactionId;

    return {
      isValid,
      event,
      status,
      transactionId,
      signedAt: new Date(),
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
