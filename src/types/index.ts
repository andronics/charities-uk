// Normalized types
export type {
  Regulator,
  CharityStatus,
  Charity,
  Trustee,
  FinancialYear,
} from './charity.js';

// Search types
export type {
  SearchQuery,
  SearchResult,
  SearchAggregations,
  AggregationBucket,
  ClientConfig,
} from './search.js';

// Raw API types
export * from './raw/index.js';
