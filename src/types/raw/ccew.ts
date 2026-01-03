/**
 * CCEW (Charity Commission for England & Wales) raw API types.
 * These match the exact structure returned by the CCEW API.
 */

/**
 * CCEW charity search response.
 */
export interface CCEWSearchResponse {
  charities: CCEWCharitySummary[];
  totalResults: number;
  pageNumber: number;
  pageSize: number;
}

/**
 * CCEW charity summary (search result).
 */
export interface CCEWCharitySummary {
  registeredCharityNumber: number;
  linkedCharityNumber: number;
  charityName: string;
  charityType: string;
  registrationStatus: string;
  dateOfRegistration: string;
  dateOfRemoval: string | null;
}

/**
 * CCEW full charity details (GetAllCharityDetailsV2).
 */
export interface CCEWCharityDetails {
  // Basic info
  registeredCharityNumber: number;
  linkedCharityNumber: number;
  charityName: string;
  charityRegistrationStatus: string;
  dateOfRegistration: string;
  dateOfRemoval: string | null;

  // Contact
  charityContactWeb: string | null;
  charityContactEmail: string | null;
  charityContactPhone: string | null;
  charityContactAddress1: string | null;
  charityContactAddress2: string | null;
  charityContactAddress3: string | null;
  charityContactAddress4: string | null;
  charityContactAddress5: string | null;
  charityContactPostcode: string | null;

  // Organisation
  organisationType: string | null;
  charityCompanyRegistrationNumber: string | null;
  charityInsolvent: boolean;
  charityInAdministration: boolean;
  charityType: string | null;

  // Financial
  latestIncome: number | null;
  latestExpenditure: number | null;
  latestFinancialYearEnd: string | null;

  // People
  numberOfEmployees: number | null;
  numberOfVolunteers: number | null;
  numberOfTrustees: number | null;

  // Classification
  charityWhoWhat: CCEWWhoWhat | null;
  charityAreasOfOperation: CCEWAreasOfOperation | null;

  // Other names
  otherNames: CCEWOtherName[];

  // Objects
  charitableObjects: string | null;

  // Governing document
  governingDocument: string | null;

  // Trustees
  trustees: CCEWTrustee[];

  // Financial history
  financialHistory: CCEWFinancialYear[];

  // Other regulators
  otherRegulators: CCEWOtherRegulator[];
}

/**
 * CCEW who/what classification.
 */
export interface CCEWWhoWhat {
  whatTheCharityDoes: string[];
  howTheCharityWorks: string[];
  whoTheCharityHelps: string[];
}

/**
 * CCEW areas of operation.
 */
export interface CCEWAreasOfOperation {
  localAuthorities: string[];
  countries: string[];
  regions: string[];
}

/**
 * CCEW other name.
 */
export interface CCEWOtherName {
  charityOtherName: string;
  charityOtherNameType: string;
}

/**
 * CCEW trustee.
 */
export interface CCEWTrustee {
  trusteeName: string;
  trusteeIsChair: boolean;
  trusteeReportingStatus: string;
  trusteeApptDate: string | null;
  trusteeCessDate: string | null;
}

/**
 * CCEW financial year.
 */
export interface CCEWFinancialYear {
  financialYearEnd: string;
  income: number;
  expenditure: number;
}

/**
 * CCEW other regulator.
 */
export interface CCEWOtherRegulator {
  regulatorName: string;
  registrationNumber: string;
}

/**
 * CCEW single charity response (GetCharityByRegisteredCharityNumber).
 */
export interface CCEWCharityResponse {
  charity: CCEWCharitySummary;
}

/**
 * CCEW charity details response (GetCharityDetails).
 */
export interface CCEWCharityDetailsResponse {
  charityDetails: CCEWCharityDetails;
}

/**
 * CCEW trustees response (GetCharityTrusteeInformationV2).
 */
export interface CCEWTrusteesResponse {
  trustees: CCEWTrustee[];
}

/**
 * CCEW financial history response (GetCharityFinancialHistory).
 */
export interface CCEWFinancialHistoryResponse {
  financialHistory: CCEWFinancialYear[];
}

/**
 * CCEW contact information response (GetCharityContactInformation).
 */
export interface CCEWContactResponse {
  contactName: string | null;
  email: string | null;
  phone: string | null;
  web: string | null;
  address: CCEWAddress;
}

/**
 * CCEW address.
 */
export interface CCEWAddress {
  line1: string | null;
  line2: string | null;
  line3: string | null;
  line4: string | null;
  line5: string | null;
  postcode: string | null;
}
