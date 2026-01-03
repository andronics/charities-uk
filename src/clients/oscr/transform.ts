import type { Charity, CharityStatus, FinancialYear } from '../../types/charity.js';
import type {
  OSCRCharity,
  OSCRAllCharitiesResponse,
  OSCRAnnualReturn,
} from '../../types/raw/oscr.js';
import type { SearchResult } from '../../types/search.js';

/**
 * Map OSCR status string to normalized CharityStatus.
 */
function mapStatus(status: string): CharityStatus {
  const statusMap: Record<string, CharityStatus> = {
    'Active': 'ACTIVE',
    'Removed': 'REMOVED',
    // OSCR doesn't have as many status types as CCNI
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
 * Transform OSCR charity to normalized Charity.
 */
export function transformCharity(raw: OSCRCharity): Charity {
  return {
    // Identifiers
    id: raw.charityNumber,
    regulator: 'OSCR',
    registrationNumber: raw.charityNumber,
    subsidiaryNumber: undefined,
    companyNumber: undefined, // OSCR doesn't provide company number in main response

    // Core info
    name: raw.charityName,
    otherNames: raw.knownAs ? [raw.knownAs] : [],
    status: mapStatus(raw.charityStatus),
    registeredDate: parseDate(raw.registeredDate),
    removedDate: null, // Not directly available

    // Contact
    website: raw.website || null,
    email: null, // Not provided in OSCR API
    phone: null, // Not provided in OSCR API
    address: raw.principalContactAddress || raw.principalOfficeOrTrusteeAddress || null,

    // Financial
    latestIncome: raw.mostRecentYearIncome ?? null,
    latestExpenditure: raw.mostRecentYearExpenditure ?? null,
    financialYearEnd: parseDate(raw.yearEnd),

    // People
    employeeCount: null, // Not in main response, in annual returns
    volunteerCount: null, // Not provided
    trusteeCount: null, // Not in main response, in annual returns

    // Classification
    purposes: raw.purposes ?? [],
    beneficiaries: raw.beneficiaries ?? [],
    activities: raw.typesOfActivities ?? [],
    areasOfOperation: [
      raw.geographicalSpread,
      raw.mainOperatingLocation,
    ].filter(Boolean) as string[],

    // Governance
    organisationType: raw.currentConstitutionalForm || null,
    governingDocumentType: null, // Not provided

    // Extended text
    charitableObjects: raw.objectives || null,
    publicBenefit: null, // Not provided
    activityDescription: raw.notes || null,

    // Raw data passthrough
    _raw: raw,
  };
}

/**
 * Transform OSCR all charities response to normalized SearchResult.
 */
export function transformAllCharitiesResponse(raw: OSCRAllCharitiesResponse): SearchResult<Charity> {
  // OSCR doesn't provide total count directly, we estimate from pages
  const pageSize = raw.data.length || 100; // Default page size
  const total = raw.totalPages * pageSize;

  return {
    items: raw.data.map(transformCharity),
    total,
    page: raw.currentPage,
    pageSize,
    totalPages: raw.totalPages,
    aggregations: undefined, // OSCR doesn't provide aggregations
  };
}

/**
 * Transform OSCR annual return to FinancialYear.
 */
export function transformAnnualReturn(raw: OSCRAnnualReturn): FinancialYear {
  return {
    yearEnd: new Date(raw.AccountingReferenceDate),
    income: raw.GrossIncome,
    expenditure: raw.GrossExpenditure,
  };
}

/**
 * Transform array of OSCR annual returns to FinancialYear array.
 */
export function transformAnnualReturns(raw: OSCRAnnualReturn[]): FinancialYear[] {
  return raw.map(transformAnnualReturn);
}

/**
 * Extract additional data from annual return to enrich Charity.
 */
export function enrichCharityWithAnnualReturn(
  charity: Charity,
  annualReturn: OSCRAnnualReturn
): Charity {
  return {
    ...charity,
    employeeCount: annualReturn.PaidStaff ?? charity.employeeCount,
    trusteeCount: annualReturn.TotalNumberofCharityTrustees ?? charity.trusteeCount,
    latestIncome: annualReturn.GrossIncome ?? charity.latestIncome,
    latestExpenditure: annualReturn.GrossExpenditure ?? charity.latestExpenditure,
    financialYearEnd: parseDate(annualReturn.AccountingReferenceDate) ?? charity.financialYearEnd,
  };
}
