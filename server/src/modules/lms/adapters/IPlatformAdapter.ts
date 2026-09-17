/**
 * Common contract that every platform adapter must implement.
 * Adding a new platform = create a new file that implements this interface.
 */
export interface PlatformConfig {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  orgSubdomain?: string;
  [key: string]: string | undefined;
}

/**
 * Shape of a course returned by any external platform adapter,
 * normalised to map directly into lms_courses columns.
 */
export interface ExternalCourse {
  /** Platform-specific stable ID (used for upsert deduplication via external_id) */
  externalId: string;
  /** Deep-link to the course on the originating platform */
  externalUrl: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  durationHours?: number;
  skillTags?: string[];
  /** Always the platform name, e.g. 'udemy' */
  source: string;
}

export interface IPlatformAdapter {
  /**
   * Fetch courses available on the platform using the provided credentials.
   * Must return an empty array (never throw) when credentials are absent or
   * when the platform API is unreachable — callers handle the empty case gracefully.
   */
  fetchCourses(config: PlatformConfig): Promise<ExternalCourse[]>;
}
