import type { Charity, CharityStatus, Trustee } from '../../types/charity.js';
import type {
  CCNICharityDetails,
  CCNICharitySummary,
  CCNISearchResponse,
  CCNITrustee,
} from '../../types/raw/ccni.js';
import type { SearchResult, AggregationBucket, SearchAggregations } from '../../types/search.js';

/**
 * Map CCNI status string to normalized CharityStatus.
 */
function mapStatus(status: string): CharityStatus {
  const statusMap: Record<string, CharityStatus> = {
    'Up-to-date': 'ACTIVE',
    'Due documents received late': 'LATE',
    'In default': 'IN_DEFAULT',
    'Removed': 'REMOVED',
    'Recently registered': 'RECENTLY_REGISTERED',
  };
  return statusMap[status] ?? 'ACTIVE';
}

/**
 * Parse ISO date string to Date object.
 * Returns null if invalid or empty.
 */
function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Transform CCNI charity details to normalized Charity.
 */
export function transformDetails(raw: CCNICharityDetails): Charity {
  return {
    // Identifiers
    id: `NIC${raw.regCharityNumber}`,
    regulator: 'CCNI',
    registrationNumber: String(raw.regCharityNumber),
    subsidiaryNumber: raw.subCharityNumber !== '0' ? raw.subCharityNumber : undefined,
    companyNumber: raw.companyNumber && raw.companyNumber !== '0' ? raw.companyNumber : undefined,

    // Core info
    name: raw.charityName,
    otherNames: raw.otherNames ?? [],
    status: mapStatus(raw.status),
    registeredDate: parseDate(raw.dateRegistered),
    removedDate: parseDate(raw.dateRemoved),

    // Contact
    website: raw.contactWebsite || null,
    email: raw.contactEmail || null,
    phone: raw.contactTel || null,
    address: raw.csvContactAddress || raw.contactAddress || null,

    // Financial
    latestIncome: raw.income ?? null,
    latestExpenditure: raw.totalExpenditure ?? null,
    financialYearEnd: parseDate(raw.dateFinancialYearEnd),

    // People
    employeeCount: raw.numberEmployees ?? null,
    volunteerCount: raw.numberVolunteers ?? null,
    trusteeCount: raw.peopleTrustees ?? null,

    // Classification
    purposes: raw.classWhat ?? [],
    beneficiaries: raw.classWho ?? [],
    activities: raw.classHow ?? [],
    areasOfOperation: raw.areasOfOperation ?? [],

    // Governance
    organisationType: raw.organisationType || null,
    governingDocumentType: raw.governingDocument?.name || null,

    // Extended text
    charitableObjects: raw.charitableObjects || null,
    publicBenefit: raw.publicBenefits || null,
    activityDescription: raw.activities || null,

    // Raw data passthrough
    _raw: raw,
  };
}

/**
 * Transform CCNI charity summary to normalized Charity.
 * Note: Summary has less data than full details.
 */
export function transformSummary(raw: CCNICharitySummary): Charity {
  const regNo = raw.regNo;

  return {
    // Identifiers
    id: `NIC${regNo}`,
    regulator: 'CCNI',
    registrationNumber: regNo,
    subsidiaryNumber: raw.subNo !== '0' ? raw.subNo : undefined,

    // Core info
    name: raw.name,
    otherNames: [],
    status: mapStatus(raw.orgType),
    registeredDate: null,
    removedDate: null,

    // Contact (not available in summary)
    website: null,
    email: null,
    phone: null,
    address: null,

    // Financial (not available in summary)
    latestIncome: null,
    latestExpenditure: null,
    financialYearEnd: null,

    // People (not available in summary)
    employeeCount: null,
    volunteerCount: null,
    trusteeCount: null,

    // Classification (not available in summary)
    purposes: [],
    beneficiaries: [],
    activities: [],
    areasOfOperation: [],

    // Governance (not available in summary)
    organisationType: null,
    governingDocumentType: null,

    // Extended text (not available in summary)
    charitableObjects: null,
    publicBenefit: null,
    activityDescription: null,

    // Raw data passthrough
    _raw: raw,
  };
}

/**
 * Transform CCNI search response to normalized SearchResult.
 */
export function transformSearchResponse(raw: CCNISearchResponse): SearchResult<Charity> {
  const aggregations: SearchAggregations = {};

  // Transform aggregation groups
  for (const group of raw.aggregationGroups) {
    aggregations[group.name] = group.buckets.map(
      (bucket): AggregationBucket => ({
        value: bucket.key,
        label: bucket.displayName,
        count: bucket.count,
      })
    );
  }

  // Add onlyShow aggregation
  if (raw.onlyShow) {
    aggregations[raw.onlyShow.name] = raw.onlyShow.buckets.map(
      (bucket): AggregationBucket => ({
        value: bucket.key,
        label: bucket.displayName,
        count: bucket.count,
      })
    );
  }

  return {
    items: raw.pageItems.map(transformSummary),
    total: raw.totalItems,
    page: raw.pageNumber,
    pageSize: raw.pageSize,
    totalPages: raw.totalPages,
    aggregations: Object.keys(aggregations).length > 0 ? aggregations : undefined,
  };
}

/**
 * Transform CCNI trustee to normalized Trustee.
 */
export function transformTrustee(raw: CCNITrustee): Trustee {
  return {
    name: raw.name,
    isChair: raw.isChair,
    otherTrusteeships: raw.charityNumbersOfOtherTrusteeships?.map(
      (num) => `NIC${num}`
    ),
  };
}

/**
 * Transform array of CCNI trustees.
 */
export function transformTrustees(raw: CCNITrustee[]): Trustee[] {
  return raw.map(transformTrustee);
}
