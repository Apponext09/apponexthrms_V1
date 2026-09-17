import type { IPlatformAdapter, PlatformConfig, ExternalCourse } from './IPlatformAdapter';

/**
 * Udemy for Business (UFB) Adapter
 *
 * Phase 1 — STUBBED
 * -----------------------------------------
 * This adapter returns an empty array until a Udemy for Business account
 * and API credentials are configured.
 *
 * When implementing phase 2, replace the fetchCourses() body with:
 *
 *   const response = await fetch(
 *     `https://${config.orgSubdomain}.udemy.com/api-2.0/organizations/${config.orgId}/courses/list/`,
 *     {
 *       headers: {
 *         Authorization: `Bearer ${config.apiKey}`,
 *         Accept: 'application/json',
 *       },
 *     }
 *   );
 *   const json = await response.json();
 *   return json.results.map((c: any) => ({
 *     externalId: String(c.id),
 *     externalUrl: `https://www.udemy.com/course/${c.url}/`,
 *     title: c.title,
 *     description: c.description ?? '',
 *     thumbnailUrl: c.image_480x270 ?? null,
 *     durationHours: (c.content_length_video ?? 0) / 3600,
 *     skillTags: c.primary_subcategory ? [c.primary_subcategory.title] : [],
 *     source: 'udemy',
 *   }));
 *
 * Udemy UFB API reference:
 *   https://www.udemy.com/developers/affiliate/
 *
 * Required config keys:
 *   - orgSubdomain  (e.g. "acme" → acme.udemy.com)
 *   - orgId         (numeric org ID from Udemy admin)
 *   - apiKey        (Bearer token from UFB admin → Integrations → API)
 */
export class UdemyAdapter implements IPlatformAdapter {
  async fetchCourses(_config: PlatformConfig): Promise<ExternalCourse[]> {
    // TODO: implement Udemy UFB API call (see comments above)
    console.info('[UdemyAdapter] fetchCourses called — adapter is stubbed, returning []');
    return [];
  }
}

export const udemyAdapter = new UdemyAdapter();
