/**
 * Search query parameters.
 */
export interface SearchQuery {
  /** Free text search term */
  text?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Number of results per page */
  pageSize?: number;
  /** Additional filters (regulator-specific) */
  filters?: Record<string, string>;
}

/**
 * Paginated search results.
 */
export interface SearchResult<T> {
  /** Array of result items */
  items: T[];
  /** Total number of matching results */
  total: number;
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Optional aggregations/facets */
  aggregations?: SearchAggregations;
}

/**
 * Search aggregations (faceted counts).
 */
export interface SearchAggregations {
  [key: string]: AggregationBucket[];
}

/**
 * Single aggregation bucket.
 */
export interface AggregationBucket {
  /** Filter value to use */
  value: string;
  /** Display label */
  label: string;
  /** Number of matching results */
  count: number;
}

/**
 * Client configuration options.
 */
export interface ClientConfig {
  /** API key for authentication (if required) */
  apiKey?: string;
  /** Base URL override */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts for failed requests */
  retryAttempts?: number;
  /** Base delay between retries in milliseconds */
  retryDelay?: number;
}
