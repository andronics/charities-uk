/**
 * UK Charity regulators.
 */
export type Regulator = 'CCEW' | 'OSCR' | 'CCNI';

/**
 * Normalized charity status across all regulators.
 */
export type CharityStatus =
  | 'ACTIVE'
  | 'REMOVED'
  | 'IN_DEFAULT'
  | 'LATE'
  | 'RECENTLY_REGISTERED';

/**
 * Normalized charity data structure.
 * This is the public interface returned by all clients regardless of source regulator.
 */
export interface Charity {
  // Identifiers
  /** Full ID with prefix (NIC100002, SC000001, 1234567) */
  id: string;
  /** Source regulator */
  regulator: Regulator;
  /** Registration number only (without prefix) */
  registrationNumber: string;
  /** Subsidiary number if applicable */
  subsidiaryNumber?: string;
  /** Companies House number if registered as company */
  companyNumber?: string;

  // Core info
  /** Primary charity name */
  name: string;
  /** Alternative/previous names */
  otherNames: string[];
  /** Current registration status */
  status: CharityStatus;
  /** Date first registered */
  registeredDate: Date | null;
  /** Date removed from register (if applicable) */
  removedDate: Date | null;

  // Contact
  /** Official website URL */
  website: string | null;
  /** Contact email address */
  email: string | null;
  /** Contact phone number */
  phone: string | null;
  /** Registered address */
  address: string | null;

  // Financial (latest year)
  /** Most recent reported income */
  latestIncome: number | null;
  /** Most recent reported expenditure */
  latestExpenditure: number | null;
  /** Financial year end date */
  financialYearEnd: Date | null;

  // People
  /** Number of employees */
  employeeCount: number | null;
  /** Number of volunteers */
  volunteerCount: number | null;
  /** Number of trustees */
  trusteeCount: number | null;

  // Classification
  /** What the charity does (purposes) */
  purposes: string[];
  /** Who the charity helps (beneficiaries) */
  beneficiaries: string[];
  /** How the charity operates (activities/methods) */
  activities: string[];
  /** Geographic areas of operation */
  areasOfOperation: string[];

  // Governance
  /** Type of organisation (CIO, Trust, Company, etc.) */
  organisationType: string | null;
  /** Type of governing document */
  governingDocumentType: string | null;

  // Extended text
  /** Charitable objects/mission statement */
  charitableObjects: string | null;
  /** Public benefit statement */
  publicBenefit: string | null;
  /** Description of activities */
  activityDescription: string | null;

  // Raw data passthrough
  /** Original API response for escape hatch */
  _raw: unknown;
}

/**
 * Charity trustee information.
 */
export interface Trustee {
  /** Trustee name */
  name: string;
  /** Whether this trustee is the chair */
  isChair: boolean;
  /** Other charities where this person is a trustee */
  otherTrusteeships?: string[];
}

/**
 * Financial year data.
 */
export interface FinancialYear {
  /** Financial year end date */
  yearEnd: Date;
  /** Total income for the year */
  income: number;
  /** Total expenditure for the year */
  expenditure: number;
}
