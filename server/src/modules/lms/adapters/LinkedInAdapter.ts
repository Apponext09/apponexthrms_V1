import type { IPlatformAdapter, PlatformConfig, ExternalCourse } from './IPlatformAdapter';

/**
 * LinkedIn Learning Adapter
 *
 * Phase 1 — STUBBED with Production Contract
 * -------------------------------------------
 * This adapter returns an empty array until a LinkedIn Learning Enterprise
 * subscription and API credentials are configured.
 *
 * LinkedIn Learning API Flow (for production activation):
 *
 * 1. OAuth2 Client Credentials grant:
 *    POST https://www.linkedin.com/oauth/v2/accessToken
 *    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
 *    body: grant_type=client_credentials&client_id={config.clientId}&client_secret={config.clientSecret}
 *
 * 2. Fetch learning assets catalog:
 *    GET https://api.linkedin.com/v2/learningAssets?q=criteria&assetType=COURSE&count=100
 *    headers: { Authorization: `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' }
 *
 * 3. Map LinkedIn learning assets into ExternalCourse[]:
 *    return json.elements.map((asset: any) => ({
 *      externalId: asset.urn || String(asset.id),
 *      externalUrl: asset.webLaunchUrl || `https://www.linkedin.com/learning/${asset.slug || asset.urn}`,
 *      title: asset.title?.value || asset.title,
 *      description: asset.description?.value || asset.shortDescription || '',
 *      thumbnailUrl: asset.images?.primary || null,
 *      durationHours: asset.timeToComplete ? asset.timeToComplete.duration / 3600 : undefined,
 *      skillTags: Array.isArray(asset.classifications)
 *        ? asset.classifications.map((c: any) => c.name?.value || c.name)
 *        : [],
 *      source: 'linkedin',
 *    }));
 *
 * LinkedIn Learning API Documentation Reference:
 *   https://learn.microsoft.com/en-us/linkedin/learning/
 *
 * Required config keys:
 *   - clientId     (LinkedIn OAuth2 Client ID)
 *   - clientSecret (LinkedIn OAuth2 Client Secret)
 *   - orgUrn       (Optional Enterprise Account / Organization URN)
 */
export class LinkedInAdapter implements IPlatformAdapter {
  async fetchCourses(_config: PlatformConfig): Promise<ExternalCourse[]> {
    // LinkedIn Learning API stub
    console.info('[LinkedInAdapter] fetchCourses called — adapter is stubbed, returning []');
    return [];
  }
}

export const linkedinAdapter = new LinkedInAdapter();
