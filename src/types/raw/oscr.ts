/**
 * OSCR (Office of the Scottish Charity Regulator) raw API types.
 * These match the exact structure returned by the OSCR API.
 */

/**
 * OSCR all charities response.
 */
export interface OSCRAllCharitiesResponse {
  currentPage: number;
  totalPages: number;
  prev: string | null;
  next: string | null;
  data: OSCRCharity[];
}

/**
 * OSCR charity record.
 */
export interface OSCRCharity {
  /** Internal UUID */
  id: string;
  /** Charity name */
  charityName: string;
  /** Charity number (SC prefix) */
  charityNumber: string;
  /** Registration date (ISO format) */
  registeredDate: string;
  /** Trading/known as name */
  knownAs: string | null;
  /** Website URL */
  website: string | null;
  /** Parent charity name (if subsidiary) */
  parentCharityName: string | null;
  /** Parent charity number */
  parentCharityNumber: string | null;
  /** Parent charity country of registration */
  parentCharityCountryOfRegistration: string | null;
  /** Whether designated as religious body */
  designatedReligiousBody: boolean;
  /** Registration status */
  charityStatus: string;
  /** Constitutional form (Trust, Company, SCIO, etc.) */
  currentConstitutionalForm: string;
  /** Additional notes */
  notes: string | null;
  /** Geographic spread of activities */
  geographicalSpread: string;
  /** Main operating location */
  mainOperatingLocation: string;
  /** Charitable purposes */
  purposes: string[];
  /** Beneficiary groups */
  beneficiaries: string[];
  /** Types of activities */
  typesOfActivities: string[];
  /** Charitable objectives */
  objectives: string;
  /** Regulatory type */
  regulatoryType: string | null;
  /** Charity type */
  charityType: string | null;
  /** Postcode */
  postcode: string;
  /** Principal office/trustee address */
  principalOfficeOrTrusteeAddress: string;
  /** Principal contact address */
  principalContactAddress?: string;
  /** Most recent year income */
  mostRecentYearIncome: number;
  /** Most recent year expenditure */
  mostRecentYearExpenditure: number;
  /** Next year end date */
  nextYearEndDate: string;
  /** Mailing cycle */
  mailingCycle: string;
  /** Year end date */
  yearEnd: string;
}

/**
 * OSCR annual return record.
 */
export interface OSCRAnnualReturn {
  /** Unique reference ID */
  UniqueReference: string;
  /** Charity number */
  CharityNumber: string;
  /** Accounting reference date (year end) */
  AccountingReferenceDate: string;
  /** Gross income */
  GrossIncome: number;
  /** Gross expenditure */
  GrossExpenditure: number;
  /** Date return was received */
  ReceivedDate: string | null;
  /** Income from donations and legacies */
  DonationsAndLegaciesIncome: number;
  /** Income from charitable activities */
  CharitableActivitiesIncome: number;
  /** Income from other trading activities */
  OtherTradingActivitiesIncome: number;
  /** Investment income */
  InvestmentsIncome: number;
  /** Other income */
  OtherIncome: number;
  /** Spending on raising funds */
  RaisingFundsSpending: number;
  /** Expenditure on charitable activities */
  CharitableActivitiesExpenditure: number;
  /** Other expenditure */
  OtherExpenditure: number;
  /** Total number of trustees */
  TotalNumberofCharityTrustees: number;
  /** Number of paid staff */
  PaidStaff: number;
  /** Whether charity provided link to accounts */
  CharityProvidedLinkToAccount?: boolean;
  /** Link to charity accounts */
  LinkToCharityAccount?: string | null;
}
