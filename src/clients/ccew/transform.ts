import type { Charity, CharityStatus, Trustee, FinancialYear } from '../../types/charity.js';
import type {
  CCEWCharityDetails,
  CCEWCharitySummary,
  CCEWSearchResponse,
  CCEWTrustee,
  CCEWFinancialYear,
} from '../../types/raw/ccew.js';
import type { SearchResult } from '../../types/search.js';

/**
 * Map CCEW registration status to normalized CharityStatus.
 */
function mapStatus(status: string): CharityStatus {
  const statusMap: Record<string, CharityStatus> = {
    'Registered': 'ACTIVE',
    'Removed': 'REMOVED',
    // CCEW doesn't have as many status types
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
 * Format address from CCEW address fields.
 */
function formatAddress(details: CCEWCharityDetails): string | null {
  const parts = [
    details.charityContactAddress1,
    details.charityContactAddress2,
    details.charityContactAddress3,
    details.charityContactAddress4,
    details.charityContactAddress5,
    details.charityContactPostcode,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Transform CCEW full charity details to normalized Charity.
 */
export function transformDetails(raw: CCEWCharityDetails): Charity {
  return {
    // Identifiers
    id: String(raw.registeredCharityNumber),
    regulator: 'CCEW',
    registrationNumber: String(raw.registeredCharityNumber),
    subsidiaryNumber: raw.linkedCharityNumber !== 0 ? String(raw.linkedCharityNumber) : undefined,
    companyNumber: raw.charityCompanyRegistrationNumber || undefined,

    // Core info
    name: raw.charityName,
    otherNames: raw.otherNames?.map(n => n.charityOtherName) ?? [],
    status: mapStatus(raw.charityRegistrationStatus),
    registeredDate: parseDate(raw.dateOfRegistration),
    removedDate: parseDate(raw.dateOfRemoval),

    // Contact
    website: raw.charityContactWeb || null,
    email: raw.charityContactEmail || null,
    phone: raw.charityContactPhone || null,
    address: formatAddress(raw),

    // Financial
    latestIncome: raw.latestIncome ?? null,
    latestExpenditure: raw.latestExpenditure ?? null,
    financialYearEnd: parseDate(raw.latestFinancialYearEnd),

    // People
    employeeCount: raw.numberOfEmployees ?? null,
    volunteerCount: raw.numberOfVolunteers ?? null,
    trusteeCount: raw.numberOfTrustees ?? null,

    // Classification
    purposes: raw.charityWhoWhat?.whatTheCharityDoes ?? [],
    beneficiaries: raw.charityWhoWhat?.whoTheCharityHelps ?? [],
    activities: raw.charityWhoWhat?.howTheCharityWorks ?? [],
    areasOfOperation: [
      ...(raw.charityAreasOfOperation?.regions ?? []),
      ...(raw.charityAreasOfOperation?.countries ?? []),
      ...(raw.charityAreasOfOperation?.localAuthorities ?? []),
    ],

    // Governance
    organisationType: raw.organisationType || null,
    governingDocumentType: raw.governingDocument || null,

    // Extended text
    charitableObjects: raw.charitableObjects || null,
    publicBenefit: null, // Not available in CCEW API
    activityDescription: null, // Not available as separate field

    // Raw data passthrough
    _raw: raw,
  };
}

/**
 * Transform CCEW charity summary to normalized Charity.
 * Note: Summary has less data than full details.
 */
export function transformSummary(raw: CCEWCharitySummary): Charity {
  return {
    // Identifiers
    id: String(raw.registeredCharityNumber),
    regulator: 'CCEW',
    registrationNumber: String(raw.registeredCharityNumber),
    subsidiaryNumber: raw.linkedCharityNumber !== 0 ? String(raw.linkedCharityNumber) : undefined,

    // Core info
    name: raw.charityName,
    otherNames: [],
    status: mapStatus(raw.registrationStatus),
    registeredDate: parseDate(raw.dateOfRegistration),
    removedDate: parseDate(raw.dateOfRemoval),

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
    organisationType: raw.charityType || null,
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
 * Transform CCEW search response to normalized SearchResult.
 */
export function transformSearchResponse(raw: CCEWSearchResponse): SearchResult<Charity> {
  return {
    items: raw.charities.map(transformSummary),
    total: raw.totalResults,
    page: raw.pageNumber,
    pageSize: raw.pageSize,
    totalPages: Math.ceil(raw.totalResults / raw.pageSize),
    aggregations: undefined, // CCEW doesn't provide aggregations in search
  };
}

/**
 * Transform CCEW trustee to normalized Trustee.
 */
export function transformTrustee(raw: CCEWTrustee): Trustee {
  return {
    name: raw.trusteeName,
    isChair: raw.trusteeIsChair,
    otherTrusteeships: undefined, // Not provided by CCEW
  };
}

/**
 * Transform array of CCEW trustees.
 */
export function transformTrustees(raw: CCEWTrustee[]): Trustee[] {
  return raw.map(transformTrustee);
}

/**
 * Transform CCEW financial year to normalized FinancialYear.
 */
export function transformFinancialYear(raw: CCEWFinancialYear): FinancialYear {
  return {
    yearEnd: new Date(raw.financialYearEnd),
    income: raw.income,
    expenditure: raw.expenditure,
  };
}

/**
 * Transform array of CCEW financial years.
 */
export function transformFinancialHistory(raw: CCEWFinancialYear[]): FinancialYear[] {
  return raw.map(transformFinancialYear);
}
