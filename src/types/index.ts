// Normalized types
export type {
  Regulator,
  CharityStatus,
  Charity,
  Trustee,
  FinancialYear,
  OtherRegulatorInfo,
} from './charity.js';

// Search types
export type {
  SearchQuery,
  SearchResult,
  SearchAggregations,
  AggregationBucket,
  ClientConfig,
  CacheConfig,
} from './search.js';

// Raw API types
export * from './raw/index.js';
