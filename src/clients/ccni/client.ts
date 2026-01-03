import { BaseClient } from '../../core/base-client.js';
import type { Charity, Trustee, FinancialYear, OtherRegulatorInfo, Regulator } from '../../types/charity.js';
import type { SearchQuery, SearchResult, ClientConfig } from '../../types/search.js';
import type { CCNISearchResponse, CCNICharityDetails } from '../../types/raw/ccni.js';
import { transformDetails, transformSearchResponse, transformTrustees } from './transform.js';
import { CharityNotFoundError } from '../../core/errors.js';

/**
 * CCNI-specific search filters.
 */
export interface CCNISearchFilters {
  /** Status filter (e.g., "Up-to-date", "In default") */
  onlyShow?: string;
  /** Income band filter */
  income?: string;
  /** "What" classification filter */
  classification1?: string;
  /** "Who" classification filter */
  classification2?: string;
  /** "How" classification filter */
  classification3?: string;
  /** Area of operation - region */
  aooa?: string;
  /** Area of operation - country */
  aood?: string;
}

/**
 * CCNI API base URL.
 */
const CCNI_BASE_URL = 'https://www.charitycommissionni.org.uk/umbraco/api/charityApi';

/**
 * CCNI context ID (required for search).
 */
const CCNI_CONTEXT_ID = 2153;

/**
 * Client for the Charity Commission for Northern Ireland (CCNI) API.
 *
 * @example
 * ```typescript
 * const client = new CCNIClient();
 *
 * // Search for charities
 * const results = await client.search({ text: 'cancer' });
 *
 * // Get charity details
 * const charity = await client.getCharity('100002');
 * ```
 */
export class CCNIClient extends BaseClient {
  readonly regulator: Regulator = 'CCNI';

  constructor(config: Omit<ClientConfig, 'apiKey'> = {}) {
    // CCNI doesn't require an API key
    super(config);
  }

  protected getDefaultBaseUrl(): string {
    return CCNI_BASE_URL;
  }

  protected getAuthHeaders(): Record<string, string> {
    // CCNI requires no authentication
    return {};
  }

  /**
   * Search for charities.
   *
   * @param query - Search parameters
   * @returns Paginated search results with aggregations
   */
  async search(query: SearchQuery = {}): Promise<SearchResult<Charity>> {
    const { text = '', page = 1, filters = {} } = query;

    const params: Record<string, string | number> = {
      searchText: text,
      pageNumber: page,
      contextId: CCNI_CONTEXT_ID,
    };

    // Add optional filters
    const ccniFilters = filters as CCNISearchFilters;
    if (ccniFilters.onlyShow) params.onlyShow = ccniFilters.onlyShow;
    if (ccniFilters.income) params.income = ccniFilters.income;
    if (ccniFilters.classification1) params.classification1 = ccniFilters.classification1;
    if (ccniFilters.classification2) params.classification2 = ccniFilters.classification2;
    if (ccniFilters.classification3) params.classification3 = ccniFilters.classification3;
    if (ccniFilters.aooa) params.aooa = ccniFilters.aooa;
    if (ccniFilters.aood) params.aood = ccniFilters.aood;

    const queryString = this.buildQueryString(params);
    const response = await this.get<CCNISearchResponse>(`/getSearchResults${queryString}`);

    return transformSearchResponse(response.data);
  }

  /**
   * Get charity details by registration number.
   *
   * @param id - Charity registration number (with or without NIC prefix)
   * @returns Charity details or null if not found
   *
   * @example
   * ```typescript
   * // Both formats work:
   * const charity = await client.getCharity('100002');
   * const charity = await client.getCharity('NIC100002');
   * ```
   */
  async getCharity(id: string): Promise<Charity | null> {
    // Strip NIC prefix if present
    const regId = id.replace(/^NIC/i, '');

    // Check cache first
    const cacheKey = this.getCacheKey('getCharity', regId);
    const cached = this.getCached<Charity | null>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const queryString = this.buildQueryString({
        regId,
        subId: 0,
      });

      const response = await this.get<CCNICharityDetails>(`/getCharityDetails${queryString}`);

      // CCNI returns empty object for not found
      if (!response.data || !response.data.regCharityNumber) {
        this.setCache(cacheKey, null);
        return null;
      }

      const result = transformDetails(response.data);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      if (error instanceof CharityNotFoundError) {
        this.setCache(cacheKey, null);
        return null;
      }
      throw error;
    }
  }

  /**
   * Get charity details including subsidiary.
   *
   * @param regId - Main registration number
   * @param subId - Subsidiary number
   * @returns Charity details or null if not found
   */
  async getCharityWithSubsidiary(regId: string, subId: string | number): Promise<Charity | null> {
    const cleanRegId = regId.replace(/^NIC/i, '');

    try {
      const queryString = this.buildQueryString({
        regId: cleanRegId,
        subId,
      });

      const response = await this.get<CCNICharityDetails>(`/getCharityDetails${queryString}`);

      if (!response.data || !response.data.regCharityNumber) {
        return null;
      }

      return transformDetails(response.data);
    } catch (error) {
      if (error instanceof CharityNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Search for charities by name.
   *
   * @param name - Charity name to search for
   * @param page - Page number (1-indexed, default: 1)
   * @returns Paginated search results
   */
  async searchByName(name: string, page = 1): Promise<SearchResult<Charity>> {
    return this.search({ text: name, page });
  }

  /**
   * Get trustees for a charity.
   *
   * @param id - Charity registration number (with or without NIC prefix)
   * @returns Array of trustees or empty array if not found
   */
  async getTrustees(id: string): Promise<Trustee[]> {
    const charity = await this.getCharity(id);

    if (!charity) {
      return [];
    }

    const raw = charity._raw as CCNICharityDetails;
    return transformTrustees(raw.trusteesList ?? []);
  }

  /**
   * Get financial history for a charity.
   *
   * NOTE: CCNI API only provides current year financial data.
   * This method returns an array with a single entry for the most recent year.
   *
   * @param id - Charity registration number (with or without NIC prefix)
   * @returns Array containing current year financials only
   */
  async getFinancialHistory(id: string): Promise<FinancialYear[]> {
    const charity = await this.getCharity(id);

    if (!charity) {
      return [];
    }

    const raw = charity._raw as CCNICharityDetails;

    // CCNI only provides current year data
    if (!raw.dateFinancialYearEnd) {
      return [];
    }

    return [
      {
        yearEnd: new Date(raw.dateFinancialYearEnd),
        income: raw.income ?? 0,
        expenditure: raw.totalExpenditure ?? 0,
      },
    ];
  }

  /**
   * Get other regulators where the charity is registered.
   *
   * NOTE: CCNI API does not provide cross-regulator information.
   *
   * @param _id - Charity registration number (unused)
   * @returns Empty array (not supported)
   */
  async getOtherRegulators(_id: string): Promise<OtherRegulatorInfo[]> {
    this.logNotImplemented('getOtherRegulators');
    return [];
  }
}
