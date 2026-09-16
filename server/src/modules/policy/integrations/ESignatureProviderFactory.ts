import type { IESignatureProvider } from './IESignatureProvider';
import { DocuSignProvider } from './DocuSignProvider';
import { LeegalityProvider } from './LeegalityProvider';
import { AdobeSignProvider } from './AdobeSignProvider';
import { GenericESignProvider } from './GenericESignProvider';

export class ESignatureProviderFactory {
  static getProvider(providerName?: string): IESignatureProvider {
    const activeProvider = (providerName || process.env.ESIGN_PROVIDER || 'docusign').toLowerCase().trim();

    switch (activeProvider) {
      case 'docusign':
        return new DocuSignProvider();
      case 'leegality':
        return new LeegalityProvider();
      case 'adobesign':
      case 'adobe_sign':
      case 'adobe':
        return new AdobeSignProvider();
      case 'generic':
      default:
        // Default to DocuSign if specified, otherwise Generic
        if (activeProvider === 'docusign') return new DocuSignProvider();
        return new GenericESignProvider();
    }
  }
}
