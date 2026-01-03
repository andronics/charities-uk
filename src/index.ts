/**
 * UK Charity Commission Clients
 *
 * TypeScript clients for UK charity regulator APIs:
 * - CCEW (England & Wales)
 * - OSCR (Scotland)
 * - CCNI (Northern Ireland)
 */

// Error classes
export {
  CharityApiError,
  CharityNotFoundError,
  RateLimitError,
  AuthenticationError,
  NetworkError,
  ApiError,
} from './core/index.js';

// Types
export type {
  // Normalized types
  Regulator,
  CharityStatus,
  Charity,
  Trustee,
  FinancialYear,
  // Search types
  SearchQuery,
  SearchResult,
  SearchAggregations,
  AggregationBucket,
  ClientConfig,
} from './types/index.js';

// Raw API types (for advanced users)
export type {
  // CCNI
  CCNISearchResponse,
  CCNICharitySummary,
  CCNICharityDetails,
  CCNITrustee,
  // OSCR
  OSCRAllCharitiesResponse,
  OSCRCharity,
  OSCRAnnualReturn,
  // CCEW
  CCEWSearchResponse,
  CCEWCharitySummary,
  CCEWCharityDetails,
  CCEWTrustee,
  CCEWFinancialYear,
} from './types/index.js';

// Clients will be exported here as they are implemented:
// export { CCNIClient } from './clients/ccni/index.js';
// export { OSCRClient } from './clients/oscr/index.js';
// export { CCEWClient } from './clients/ccew/index.js';
