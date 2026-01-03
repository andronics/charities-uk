/**
 * CCNI (Charity Commission for Northern Ireland) raw API types.
 * These match the exact structure returned by the CCNI API.
 */

/**
 * CCNI search response.
 */
export interface CCNISearchResponse {
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  pageItems: CCNICharitySummary[];
  aggregationGroups: CCNIAggregationGroup[];
  onlyShow: CCNIAggregationGroup;
}

/**
 * CCNI charity summary (search result item).
 */
export interface CCNICharitySummary {
  regNo: string;
  subNo: string;
  name: string;
  orgType: string;
  url: string;
  statusLabel: string;
  statusCssStyle: string;
  hideStatus: boolean;
}

/**
 * CCNI aggregation group (facet).
 */
export interface CCNIAggregationGroup {
  name: string;
  displayName: string;
  buckets: CCNIAggregationBucket[];
}

/**
 * CCNI aggregation bucket.
 */
export interface CCNIAggregationBucket {
  key: string;
  displayName: string;
  count: number;
  isSelected: boolean;
}

/**
 * CCNI full charity details.
 */
export interface CCNICharityDetails {
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

  // Financial summary
  income: number;
  incTotal: string;
  expTotal: string;
  dateFinancialYearStart: string;
  dateFinancialYearEnd: string;

  // Detailed financials - income
  incVoluntary: number;
  incTradingRaiseFunds: number;
  incInvestment: number;
  incCharitableActivities: number;
  incOther: number;
  totalIncomeEndowments: number;

  // Detailed financials - expenditure
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
  areasOperationList: CCNIAreaOfOperation[];
  countryCode: string[];

  // Purposes
  charitableObjects: string;
  activities: string;
  publicBenefits: string;
  areaBenefit: string;

  // Governance
  governingDocument: CCNIGoverningDocument;

  // Documents
  dsSubmittedDocumentsByYear: CCNIFinancialYearDocuments[];

  // Linked entities
  linkedCharities: CCNILinkedCharity[];
  parentCharity: CCNILinkedCharity | null;
}

/**
 * CCNI trustee.
 */
export interface CCNITrustee {
  id: number;
  name: string;
  isChair: boolean;
  charityNumbersOfOtherTrusteeships: number[];
}

/**
 * CCNI area of operation.
 */
export interface CCNIAreaOfOperation {
  type: string;
  name: string;
}

/**
 * CCNI governing document.
 */
export interface CCNIGoverningDocument {
  url: string | null;
  name: string;
}

/**
 * CCNI financial year documents.
 */
export interface CCNIFinancialYearDocuments {
  financialYear: string;
  documents: CCNIDocument[];
}

/**
 * CCNI document.
 */
export interface CCNIDocument {
  url: string;
  name: string;
  qualifiedAccounts: boolean;
}

/**
 * CCNI linked charity.
 */
export interface CCNILinkedCharity {
  regNo: number;
  subNo: string;
  name: string;
  url: string;
}
