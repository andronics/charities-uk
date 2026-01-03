# UK Charity Commission Clients - Architecture

## Overview

This library provides a unified TypeScript interface for accessing charity data from all three UK charity regulators. Each regulator has a different API structure, authentication mechanism, and data format - this library normalizes them into a consistent interface.

```
┌─────────────────────────────────────────────────────────┐
│                    Unified Interface                     │
│  CharityClient.search() / .getCharity() / .getTrustees() │
└────────────────────────────┬────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  CCEWClient   │   │  OSCRClient   │   │  CCNIClient   │
│  (REST API)   │   │  (REST API)   │   │  (REST API)   │
└───────────────┘   └───────────────┘   └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    ┌───────────────┐
                    │  BaseClient   │
                    │ (HTTP, retry, │
                    │ rate limiting)│
                    └───────────────┘
```

## Regulators Comparison

| Aspect | CCEW | OSCR | CCNI |
|--------|------|------|------|
| **Jurisdiction** | England & Wales | Scotland | Northern Ireland |
| **Charity count** | ~170,000 | ~25,000 | ~7,200 |
| **ID format** | Number (e.g., `1234567`) | SC prefix (e.g., `SC000001`) | NIC prefix (e.g., `NIC100002`) |
| **API auth** | `Ocp-Apim-Subscription-Key` header | `x-functions-key` header | None required |
| **Search** | Multiple endpoints | Pagination only | Faceted search |
| **Rate limiting** | Yes (unspecified) | Yes (unspecified) | Unknown |

---

## API Specifications

### CCNI (Northern Ireland)

**Base URL:** `https://www.charitycommissionni.org.uk/umbraco/api/charityApi`

**Authentication:** None required

#### Search Endpoint

```http
GET /getSearchResults?searchText=&pageNumber=1&contextId=2153
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `searchText` | string | No | Free text search |
| `pageNumber` | number | Yes | 1-indexed page |
| `contextId` | number | Yes | Fixed: `2153` |
| `onlyShow` | string | No | Status filter |
| `income` | string | No | Income band |
| `classification1` | string | No | "What" filter |
| `classification2` | string | No | "Who" filter |
| `classification3` | string | No | "How" filter |
| `aooa` | string | No | Region filter |
| `aood` | string | No | Country filter |

**Response:**
```typescript
interface CCNISearchResponse {
  pageNumber: number;
  pageSize: number;           // Always 15
  totalPages: number;
  totalItems: number;
  pageItems: CCNICharitySummary[];
  aggregationGroups: AggregationGroup[];
  onlyShow: AggregationGroup;
}

interface CCNICharitySummary {
  regNo: string;              // "100002"
  subNo: string;              // "0"
  name: string;
  orgType: string;            // "Up-to-date", "In default", etc.
  url: string;                // Relative URL
  statusLabel: string;
  statusCssStyle: string;
  hideStatus: boolean;
}
```

#### Details Endpoint

```http
GET /getCharityDetails?regId=100002&subId=0
```

**Response:** Full `CCNICharityDetails` object (see Types section below).

---

### OSCR (Scotland)

**Base URL:** `https://oscrapi.azurewebsites.net/api`

**Authentication:** `x-functions-key` header

#### All Charities Endpoint

```http
GET /all_charities?page=1
GET /all_charities?charitynumber=SC000001
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (1-indexed) |
| `charitynumber` | string | No | Direct lookup by SC number |

**Response:**
```typescript
interface OSCRAllCharitiesResponse {
  currentPage: number;
  totalPages: number;
  prev: string | null;
  next: string | null;
  data: OSCRCharity[];
}
```

#### Annual Returns Endpoint

```http
GET /annualreturns?charityid={uuid}
```

**Note:** Requires the internal UUID from `OSCRCharity.id`, not the charity number.

**Response:** `OSCRAnnualReturn[]`

---

### CCEW (England & Wales)

**Base URL:** `https://api.charitycommission.gov.uk/register/api`

**Authentication:** `Ocp-Apim-Subscription-Key` header

#### Available Operations

| Operation | Description |
|-----------|-------------|
| `GetCharities` | Multi-criteria search |
| `GetCharitiesByKeyword` | Keyword search |
| `GetCharitiesByName` | Name search |
| `GetCharityByRegisteredCharityNumber` | Single lookup |
| `GetCharityDetails` | Core information |
| `GetCharityContactInformation` | Contact details |
| `GetCharityFinancialHistory` | 5-year financials |
| `GetCharityTrusteeInformationV2` | Trustees |
| `GetCharityWhoWhatHow` | Classification |
| `GetCharityAreasOfOperation` | Geography |
| `GetCharityOtherRegulators` | Cross-registration |
| `GetAllCharityDetailsV2` | Comprehensive single call |

**Note:** CCEW has the most complex API with many specialized endpoints. Consider using `GetAllCharityDetailsV2` when available to minimize calls.

---

## Type Definitions

### Normalized Types (Public Interface)

```typescript
type Regulator = 'CCEW' | 'OSCR' | 'CCNI';

type CharityStatus =
  | 'ACTIVE'
  | 'REMOVED'
  | 'IN_DEFAULT'
  | 'LATE'
  | 'RECENTLY_REGISTERED';

interface Charity {
  // Identifiers
  id: string;                          // Full ID with prefix (NIC100002, SC000001, 1234567)
  regulator: Regulator;
  registrationNumber: string;          // Number only
  subsidiaryNumber?: string;
  companyNumber?: string;

  // Core info
  name: string;
  otherNames: string[];
  status: CharityStatus;
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
  purposes: string[];                  // What the charity does
  beneficiaries: string[];             // Who it helps
  activities: string[];                // How it operates
  areasOfOperation: string[];          // Where it works

  // Governance
  organisationType: string | null;     // CIO, Trust, Company, etc.
  governingDocumentType: string | null;

  // Extended text
  charitableObjects: string | null;
  publicBenefit: string | null;
  activityDescription: string | null;

  // Raw data passthrough
  _raw: unknown;
}

interface SearchQuery {
  text?: string;
  page?: number;
  pageSize?: number;
  filters?: Record<string, string>;
}

interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  aggregations?: SearchAggregations;
}

interface SearchAggregations {
  [key: string]: AggregationBucket[];
}

interface AggregationBucket {
  value: string;
  label: string;
  count: number;
}
```

### Raw API Types

#### CCNI Raw Types

```typescript
interface CCNICharityDetails {
  // Identification
  regCharityNumber: number;
  subCharityNumber: string;
  charityName: string;
  mainCharityName: string;
  otherNames: string[];
  companyNumber: string;
  organisationType: string;
  charityType: string | null;

  // Status
  status: string;
  additionalStatus: string | null;
  hideStatus: boolean;
  daysOverdue: number | null;
  dateRegistered: string;
  dateRemoved: string | null;
  inAdministration: number;
  insolvent: number;

  // Contact
  contactAddress: string;
  csvContactAddress: string;
  contactEmail: string;
  contactTel: string;
  contactWebsite: string;

  // Financial
  income: number;
  incTotal: string;
  expTotal: string;
  dateFinancialYearStart: string;
  dateFinancialYearEnd: string;

  // Detailed financials
  incVoluntary: number;
  incTradingRaiseFunds: number;
  incInvestment: number;
  incCharitableActivities: number;
  incOther: number;
  totalIncomeEndowments: number;

  expGeneratingVoluntaryIncome: number;
  expTradingRaiseFunds: number;
  expInvestmentManagement: number;
  expCharitableActivities: number;
  expGovernance: number;
  expOther: number;
  totalExpenditure: number;

  // Assets
  longTermInvestments: string;
  ownUseAssets: string;
  otherAssets: string;
  totalLiabilities: string;

  // People
  numberEmployees: number;
  numberVolunteers: number;
  peopleTrustees: number;

  // Trustees
  trusteesList: CCNITrustee[];

  // Classification
  classWhat: string[];
  classWho: string[];
  classHow: string[];

  // Geography
  areasOfOperation: string[];
  areasOperationList: { type: string; name: string }[];
  countryCode: string[];

  // Purposes
  charitableObjects: string;
  activities: string;
  publicBenefits: string;
  areaBenefit: string;

  // Governance
  governingDocument: { url: string | null; name: string };

  // Documents
  dsSubmittedDocumentsByYear: CCNIFinancialYearDocuments[];

  // Linked entities
  linkedCharities: CCNILinkedCharity[];
  parentCharity: CCNILinkedCharity | null;
}

interface CCNITrustee {
  id: number;
  name: string;
  isChair: boolean;
  charityNumbersOfOtherTrusteeships: number[];
}

interface CCNIFinancialYearDocuments {
  financialYear: string;
  documents: {
    url: string;
    name: string;
    qualifiedAccounts: boolean;
  }[];
}
```

#### OSCR Raw Types

```typescript
interface OSCRCharity {
  id: string;                          // UUID
  charityName: string;
  charityNumber: string;               // SC000001
  registeredDate: string;
  knownAs: string | null;
  website: string | null;
  parentCharityName: string | null;
  parentCharityNumber: string | null;
  parentCharityCountryOfRegistration: string | null;
  designatedReligiousBody: boolean;
  charityStatus: string;
  currentConstitutionalForm: string;
  notes: string | null;
  geographicalSpread: string;
  mainOperatingLocation: string;
  purposes: string[];
  beneficiaries: string[];
  typesOfActivities: string[];
  objectives: string;
  regulatoryType: string | null;
  charityType: string | null;
  postcode: string;
  principalOfficeOrTrusteeAddress: string;
  principalContactAddress?: string;
  mostRecentYearIncome: number;
  mostRecentYearExpenditure: number;
  nextYearEndDate: string;
  mailingCycle: string;
  yearEnd: string;
}

interface OSCRAnnualReturn {
  UniqueReference: string;
  CharityNumber: string;
  AccountingReferenceDate: string;
  GrossIncome: number;
  GrossExpenditure: number;
  ReceivedDate: string | null;
  DonationsAndLegaciesIncome: number;
  CharitableActivitiesIncome: number;
  OtherTradingActivitiesIncome: number;
  InvestmentsIncome: number;
  OtherIncome: number;
  RaisingFundsSpending: number;
  CharitableActivitiesExpenditure: number;
  OtherExpenditure: number;
  TotalNumberofCharityTrustees: number;
  PaidStaff: number;
  CharityProvidedLinkToAccount?: boolean;
  LinkToCharityAccount?: string | null;
}
```

---

## BaseClient Design

```typescript
interface ClientConfig {
  apiKey?: string;
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

abstract class BaseClient {
  protected readonly config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
  }

  // Subclasses implement auth header
  protected abstract getAuthHeaders(): Record<string, string>;

  // Shared HTTP with retry and rate limit handling
  protected async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    return this.withRetry(async () => {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...this.getAuthHeaders(),
          ...options?.headers
        }
      });

      if (response.status === 429) {
        throw new RateLimitError(response);
      }

      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError(response);
      }

      if (response.status === 404) {
        throw new CharityNotFoundError();
      }

      if (!response.ok) {
        throw new ApiError(response);
      }

      return response.json();
    });
  }

  protected async withRetry<T>(
    fn: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (
        attempt < this.config.retryAttempts! &&
        this.isRetryable(error)
      ) {
        await this.delay(this.config.retryDelay! * attempt);
        return this.withRetry(fn, attempt + 1);
      }
      throw error;
    }
  }

  private isRetryable(error: unknown): boolean {
    return (
      error instanceof RateLimitError ||
      error instanceof NetworkError
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Abstract methods each client must implement
  abstract search(query: SearchQuery): Promise<SearchResult<Charity>>;
  abstract getCharity(id: string): Promise<Charity | null>;
}
```

---

## Transform Functions

Each client has a transform module that converts raw API responses to normalized types.

### Example: CCNI Transform

```typescript
// src/clients/ccni/transform.ts

import type { Charity, CharityStatus } from '../../types/charity';
import type { CCNICharityDetails, CCNICharitySummary } from '../../types/raw/ccni';

export function transformDetails(raw: CCNICharityDetails): Charity {
  return {
    id: `NIC${raw.regCharityNumber}`,
    regulator: 'CCNI',
    registrationNumber: String(raw.regCharityNumber),
    subsidiaryNumber: raw.subCharityNumber !== '0' ? raw.subCharityNumber : undefined,
    companyNumber: raw.companyNumber !== '0' ? raw.companyNumber : undefined,

    name: raw.charityName,
    otherNames: raw.otherNames ?? [],
    status: mapStatus(raw.status),
    registeredDate: parseDate(raw.dateRegistered),
    removedDate: parseDate(raw.dateRemoved),

    website: raw.contactWebsite || null,
    email: raw.contactEmail || null,
    phone: raw.contactTel || null,
    address: raw.csvContactAddress || null,

    latestIncome: raw.income,
    latestExpenditure: raw.totalExpenditure,
    financialYearEnd: parseDate(raw.dateFinancialYearEnd),

    employeeCount: raw.numberEmployees,
    volunteerCount: raw.numberVolunteers,
    trusteeCount: raw.peopleTrustees,

    purposes: raw.classWhat ?? [],
    beneficiaries: raw.classWho ?? [],
    activities: raw.classHow ?? [],
    areasOfOperation: raw.areasOfOperation ?? [],

    organisationType: raw.organisationType,
    governingDocumentType: raw.governingDocument?.name ?? null,

    charitableObjects: raw.charitableObjects || null,
    publicBenefit: raw.publicBenefits || null,
    activityDescription: raw.activities || null,

    _raw: raw
  };
}

function mapStatus(status: string): CharityStatus {
  const map: Record<string, CharityStatus> = {
    'Up-to-date': 'ACTIVE',
    'Due documents received late': 'LATE',
    'In default': 'IN_DEFAULT',
    'Removed': 'REMOVED',
    'Recently registered': 'RECENTLY_REGISTERED'
  };
  return map[status] ?? 'ACTIVE';
}

function parseDate(iso: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date;
}
```

---

## Error Handling

```typescript
// src/core/errors.ts

export class CharityApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'CharityApiError';
  }
}

export class CharityNotFoundError extends CharityApiError {
  constructor(id?: string) {
    super(id ? `Charity not found: ${id}` : 'Charity not found');
    this.name = 'CharityNotFoundError';
  }
}

export class RateLimitError extends CharityApiError {
  public readonly retryAfter?: number;

  constructor(response: Response) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
    this.retryAfter = parseInt(response.headers.get('Retry-After') ?? '', 10) || undefined;
  }
}

export class AuthenticationError extends CharityApiError {
  constructor(response: Response) {
    super(`Authentication failed: ${response.status}`);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends CharityApiError {
  constructor(cause: unknown) {
    super('Network request failed', cause);
    this.name = 'NetworkError';
  }
}

export class ApiError extends CharityApiError {
  public readonly status: number;

  constructor(response: Response) {
    super(`API error: ${response.status} ${response.statusText}`);
    this.name = 'ApiError';
    this.status = response.status;
  }
}
```

---

## Field Mapping Reference

### Status Mapping

| CCNI | OSCR | CCEW | Normalized |
|------|------|------|------------|
| Up-to-date | Active | Registered | `ACTIVE` |
| Removed | Removed | Removed | `REMOVED` |
| In default | - | - | `IN_DEFAULT` |
| Due documents received late | - | - | `LATE` |
| Recently registered | - | - | `RECENTLY_REGISTERED` |

### ID Format Mapping

| Regulator | Raw Format | Normalized Format |
|-----------|------------|-------------------|
| CCNI | `100002` (number) | `NIC100002` |
| OSCR | `SC000001` | `SC000001` |
| CCEW | `1234567` | `1234567` |

### Classification Mapping

| Concept | CCNI Field | OSCR Field | CCEW Field |
|---------|------------|------------|------------|
| Purposes | `classWhat` | `purposes` | Classification codes |
| Beneficiaries | `classWho` | `beneficiaries` | Who benefits |
| Activities | `classHow` | `typesOfActivities` | How operates |

---

## Usage Examples

### Basic Usage

```typescript
import { CCNIClient, OSCRClient, CCEWClient } from 'uk-charity-clients';

// CCNI (no auth required)
const ccni = new CCNIClient();
const charity = await ccni.getCharity('100002');

// OSCR (requires API key)
const oscr = new OSCRClient({ apiKey: process.env.OSCR_API_KEY });
const scottishCharity = await oscr.getCharity('SC000001');

// CCEW (requires API key)
const ccew = new CCEWClient({ apiKey: process.env.CCEW_API_KEY });
const englishCharity = await ccew.getCharity('1234567');
```

### Search with Filters

```typescript
// CCNI faceted search
const results = await ccni.search({
  text: 'cancer',
  page: 1,
  filters: {
    income: 'Between £100K and £1M',
    classification1: 'The advancement of health or the saving of lives'
  }
});

console.log(`Found ${results.total} charities`);
console.log('Income breakdown:', results.aggregations?.income);
```

### Unified Search (Optional)

```typescript
import { UnifiedClient } from 'uk-charity-clients';

const client = new UnifiedClient({
  ccew: { apiKey: process.env.CCEW_API_KEY },
  oscr: { apiKey: process.env.OSCR_API_KEY }
  // CCNI needs no config
});

// Search across all regulators
const allResults = await client.searchAll({ text: 'cancer' });
```

---

## Future Considerations

### Potential Enhancements

1. **Caching layer** - Redis/memory cache for frequently accessed charities
2. **Bulk operations** - Efficient fetching of multiple charities
3. **Webhook support** - If regulators add change notifications
4. **Data download integration** - For CCEW bulk data files

### Known Limitations

1. **CCEW complexity** - Many endpoints, may need multiple calls
2. **OSCR annual returns** - Requires UUID, not charity number
3. **Rate limits** - Not publicly documented, need defensive coding
4. **Data freshness** - APIs may lag behind official registers