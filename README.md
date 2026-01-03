# @andronics/charities-uk

[![CI](https://github.com/andronics/charities-uk/actions/workflows/ci.yml/badge.svg)](https://github.com/andronics/charities-uk/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@andronics/charities-uk.svg)](https://www.npmjs.com/package/@andronics/charities-uk)

A TypeScript library for accessing UK charity regulator APIs with a unified, normalized interface.

**This is a library, not a server.** Use it in your serverless functions, Express apps, or any Node.js environment.

## Supported Regulators

| Regulator | Jurisdiction | Authentication |
|-----------|--------------|----------------|
| **CCEW** | England & Wales | API key required |
| **OSCR** | Scotland | API key required |
| **CCNI** | Northern Ireland | None required |

## Installation

```bash
npm install @andronics/charities-uk
```

## Quick Start

### CCNI (Charity Commission for Northern Ireland)

No API key required.

```typescript
import { CCNIClient } from '@andronics/charities-uk';

const ccni = new CCNIClient();

// Search for charities
const results = await ccni.search({ text: 'cancer' });
console.log(`Found ${results.total} charities`);

// Get charity details
const charity = await ccni.getCharity('100002');
console.log(charity?.name); // "Cancer Lifeline"

// Get trustees
const trustees = await ccni.getTrustees('100002');
```

### OSCR (Office of the Scottish Charity Regulator)

Requires an API key from [OSCR](https://www.oscr.org.uk/about-charities/search-the-register/download-the-scottish-charity-register/oscr-public-apis/).

```typescript
import { OSCRClient } from '@andronics/charities-uk';

const oscr = new OSCRClient({
  apiKey: process.env.OSCR_API_KEY,
});

// Get all charities (paginated)
const results = await oscr.search({ page: 1 });

// Get charity by SC number
const charity = await oscr.getCharity('SC000001');

// Get charity with financial data from annual returns
const enriched = await oscr.getCharityWithFinancials('SC000001');

// Get annual returns
const financials = await oscr.getAnnualReturns('SC000001');
```

### CCEW (Charity Commission for England and Wales)

Requires an API key from the [CCEW Developer Portal](https://api-portal.charitycommission.gov.uk/).

```typescript
import { CCEWClient } from '@andronics/charities-uk';

const ccew = new CCEWClient({
  apiKey: process.env.CCEW_API_KEY,
});

// Search for charities
const results = await ccew.search({ text: 'cancer' });

// Search by name specifically
const named = await ccew.searchByName('British Heart Foundation');

// Get charity details
const charity = await ccew.getCharity('1234567');

// Get trustees
const trustees = await ccew.getTrustees('1234567');

// Get financial history
const financials = await ccew.getFinancialHistory('1234567');
```

## Configuration

All clients accept a configuration object:

```typescript
interface ClientConfig {
  /** API key (required for CCEW and OSCR) */
  apiKey?: string;
  /** Custom base URL (optional) */
  baseUrl?: string;
  /** Retry configuration */
  retry?: {
    maxRetries?: number;  // Default: 3
    delayMs?: number;     // Default: 1000
  };
}
```

### Example with retry configuration

```typescript
const ccew = new CCEWClient({
  apiKey: process.env.CCEW_API_KEY,
  retry: {
    maxRetries: 5,
    delayMs: 2000,
  },
});
```

## Normalized Charity Interface

All clients return a normalized `Charity` interface, regardless of source regulator:

```typescript
interface Charity {
  // Identifiers
  id: string;                    // Full ID (NIC100002, SC000001, 1234567)
  regulator: 'CCEW' | 'OSCR' | 'CCNI';
  registrationNumber: string;
  subsidiaryNumber?: string;
  companyNumber?: string;

  // Core info
  name: string;
  otherNames: string[];
  status: 'ACTIVE' | 'REMOVED' | 'IN_DEFAULT' | 'LATE' | 'RECENTLY_REGISTERED';
  registeredDate: Date | null;
  removedDate: Date | null;

  // Contact
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;

  // Financial (latest year)
  latestIncome: number | null;
  latestExpenditure: number | null;
  financialYearEnd: Date | null;

  // People
  employeeCount: number | null;
  volunteerCount: number | null;
  trusteeCount: number | null;

  // Classification
  purposes: string[];
  beneficiaries: string[];
  activities: string[];
  areasOfOperation: string[];

  // Governance
  organisationType: string | null;
  governingDocumentType: string | null;

  // Extended text
  charitableObjects: string | null;
  publicBenefit: string | null;
  activityDescription: string | null;

  // Original API response (escape hatch)
  _raw: unknown;
}
```

## Error Handling

The library throws specific error types:

```typescript
import {
  CharityNotFoundError,
  RateLimitError,
  AuthenticationError,
  NetworkError,
  ApiError,
} from '@andronics/charities-uk';

try {
  const charity = await ccew.getCharity('1234567');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after: ${error.retryAfter}ms`);
  } else if (error instanceof NetworkError) {
    console.error('Network connectivity issue');
  }
}
```

Note: `getCharity()` returns `null` for not found instead of throwing.

## Client Methods

### CCNIClient

| Method | Description |
|--------|-------------|
| `search(query)` | Search charities with filters |
| `getCharity(id)` | Get charity by registration number |
| `getCharityWithSubsidiary(regId, subId)` | Get subsidiary charity |
| `getTrustees(id)` | Get trustees for a charity |

### OSCRClient

| Method | Description |
|--------|-------------|
| `search(query)` | Get all charities (paginated) |
| `getCharity(id)` | Get charity by SC number |
| `getCharityWithFinancials(id)` | Get charity with annual return data |
| `getAnnualReturns(id)` | Get financial years |

### CCEWClient

| Method | Description |
|--------|-------------|
| `search(query)` | Search by keyword |
| `searchByName(name)` | Search by charity name |
| `getCharity(id)` | Get charity by registration number |
| `getCharityWithLinked(regId, linkedId)` | Get linked charity |
| `getTrustees(id)` | Get trustees |
| `getFinancialHistory(id)` | Get up to 5 years of financials |
| `getOtherRegulators(id)` | Check cross-registration |

## Environment Variables

```bash
# Required for CCEW
CCEW_API_KEY=your-ccew-api-key

# Required for OSCR
OSCR_API_KEY=your-oscr-api-key

# CCNI requires no API key
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0 (for development)

## License

MIT
