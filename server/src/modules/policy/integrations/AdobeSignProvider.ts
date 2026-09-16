import crypto from 'crypto';
import type {
  IESignatureProvider,
  CreateSigningRequestParams,
  CreateSigningRequestResult,
  WebhookVerificationResult,
} from './IESignatureProvider';

export class AdobeSignProvider implements IESignatureProvider {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.ADOBE_SIGN_CLIENT_ID || '';
    this.clientSecret = process.env.ADOBE_SIGN_CLIENT_SECRET || '';
  }

  getProviderName(): string {
    return 'adobesign';
  }

  async createSigningRequest(params: CreateSigningRequestParams): Promise<CreateSigningRequestResult> {
    const transactionId = params.transactionId;
    const returnUrl = params.returnUrl || `${process.env.APP_URL || 'http://localhost:5173'}/employee/policies?signed=1&tx=${transactionId}`;

    const signingUrl = `${process.env.ADOBE_SIGN_URL || 'https://secure.na1.adobesign.com/public/esign'}?agreementId=${encodeURIComponent(transactionId)}&name=${encodeURIComponent(params.signerName)}&email=${encodeURIComponent(params.signerEmail)}&redirectUrl=${encodeURIComponent(returnUrl)}`;

    return {
      providerTransactionId: transactionId,
      signingUrl,
      status: 'SENT',
      rawResponse: {
        agreementId: transactionId,
        signerName: params.signerName,
        signerEmail: params.signerEmail,
      },
    };
  }

  async generateSigningUrl(transactionId: string, returnUrl?: string): Promise<string> {
    const redirectUrl = returnUrl || `${process.env.APP_URL || 'http://localhost:5173'}/employee/policies?signed=1&tx=${transactionId}`;
    return `${process.env.ADOBE_SIGN_URL || 'https://secure.na1.adobesign.com/public/esign'}?agreementId=${encodeURIComponent(transactionId)}&redirectUrl=${encodeURIComponent(redirectUrl)}`;
  }

  async trackStatus(transactionId: string): Promise<string> {
    return 'SENT';
  }

  async verifyWebhookSignature(headers: Record<string, any>, body: any, rawBody?: string): Promise<WebhookVerificationResult> {
    const signature = headers['x-adobesign-signature'] || headers['x-signature'];

    let isValid = false;
    if (this.clientSecret && signature && rawBody) {
      const computed = crypto.createHmac('sha256', this.clientSecret).update(rawBody).digest('hex');
      isValid = computed === signature;
    } else {
      isValid = true;
    }

    const event = body.event || body.status || 'SIGNED';
    const statusMap: Record<string, any> = {
      'AGREEMENT_ACTION_COMPLETED': 'SIGNED',
      'SIGNED': 'SIGNED',
      'AGREEMENT_REJECTED': 'DECLINED',
      'AGREEMENT_EXPIRED': 'EXPIRED',
    };

    const status = statusMap[event] || 'SIGNED';
    const transactionId = body.agreementId || body.transactionId || body.providerTransactionId;

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
