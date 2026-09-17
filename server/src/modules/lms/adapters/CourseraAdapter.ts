import type { IPlatformAdapter, PlatformConfig, ExternalCourse } from './IPlatformAdapter';

/**
 * Coursera for Enterprise / Business Adapter
 *
 * Phase 1 — STUBBED with Production Contract
 * -------------------------------------------
 * This adapter returns an empty array until a Coursera for Enterprise
 * organization account and API credentials are configured.
 *
 * Coursera Enterprise API Flow (for production activation):
 *
 * 1. OAuth2 Client Credentials grant to fetch access token:
 *    POST https://api.coursera.org/oauth2/client_credentials/token
 *    body: {
 *      grant_type: 'client_credentials',
 *      client_id: config.clientId,
 *      client_secret: config.clientSecret
 *    }
 *
 * 2. Fetch enterprise course catalog:
 *    GET https://api.coursera.org/api/enterpriseCourseBanners.v1?q=program&programId={config.orgId}
 *    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
 *
 * 3. Map Coursera courses into ExternalCourse[]:
 *    return json.elements.map((c: any) => ({
 *      externalId: String(c.id || c.courseId),
 *      externalUrl: `https://www.coursera.org/learn/${c.slug || c.id}`,
 *      title: c.name || c.title,
 *      description: c.description || c.shortDescription || '',
 *      thumbnailUrl: c.photoUrl || c.bannerImageUrl || null,
 *      durationHours: c.workload ? parseFloat(c.workload) : undefined,
 *      skillTags: Array.isArray(c.domainTypes) ? c.domainTypes.map((d: any) => d.subdomainId || d.domainId) : [],
 *      source: 'coursera',
 *    }));
 *
 * Coursera API Documentation Reference:
 *   https://www.coursera.org/business/api-documentation
 *
 * Required config keys:
 *   - orgId        (Coursera Enterprise Program ID or Organization ID)
 *   - clientId     (OAuth2 Client ID or API Key)
 *   - clientSecret (OAuth2 Client Secret)
 */
export class CourseraAdapter implements IPlatformAdapter {
  async fetchCourses(_config: PlatformConfig): Promise<ExternalCourse[]> {
    // Coursera Enterprise API stub
    console.info('[CourseraAdapter] fetchCourses called — adapter is stubbed, returning []');
    return [];
  }
}

export const courseraAdapter = new CourseraAdapter();
