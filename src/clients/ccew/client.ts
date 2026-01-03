import { BaseClient } from '../../core/base-client.js';
import type { Charity, Trustee, FinancialYear, OtherRegulatorInfo, Regulator } from '../../types/charity.js';
import type { SearchQuery, SearchResult, ClientConfig } from '../../types/search.js';
import type {
  CCEWSearchResponse,
  CCEWCharityDetails,
  CCEWTrustee,
  CCEWFinancialYear,
} from '../../types/raw/ccew.js';
import {
  transformDetails,
  transformSearchResponse,
  transformTrustees,
  transformFinancialHistory,
} from './transform.js';
import { CharityNotFoundError, AuthenticationError } from '../../core/errors.js';

/**
 * CCEW API base URL.
 */
const CCEW_BASE_URL = 'https://api.charitycommission.gov.uk/register/api';

/**
 * CCEW-specific search options.
 */
export interface CCEWSearchOptions {
  /** Search by charity name */
  charityName?: string;
  /** Search by keyword in charity details */
  keyword?: string;
  /** Search by charity status */
  status?: 'Registered' | 'Removed';
}

/**
 * Client for the Charity Commission for England and Wales (CCEW) API.
 *
 * Requires an API key (`Ocp-Apim-Subscription-Key` header).
 *
 * @example
 * ```typescript
 * const client = new CCEWClient({ apiKey: process.env.CCEW_API_KEY });
 *
 * // Search for charities
 * const results = await client.search({ text: 'cancer' });
 *
 * // Get charity by number
 * const charity = await client.getCharity('1234567');
 *
 * // Get trustees
 * const trustees = await client.getTrustees('1234567');
 *
 * // Get financial history
 * const financials = await client.getFinancialHistory('1234567');
 * ```
 */
export class CCEWClient extends BaseClient {
  readonly regulator: Regulator = 'CCEW';

  constructor(config: ClientConfig = {}) {
    super(config);

    if (!this.apiKey) {
      throw new Error('CCEW API requires an API key. Provide it via the apiKey config option.');
    }
  }

  protected getDefaultBaseUrl(): string {
    return CCEW_BASE_URL;
  }

  protected getAuthHeaders(): Record<string, string> {
    if (!this.apiKey) {
      return {};
    }
    return {
      'Ocp-Apim-Subscription-Key': this.apiKey,
    };
  }

  /**
   * Search for charities.
   *
   * Uses the GetCharitiesByKeyword endpoint for text search,
   * or GetCharitiesByName for name-specific search.
   *
   * @param query - Search parameters
   * @returns Paginated search results
   */
  async search(query: SearchQuery = {}): Promise<SearchResult<Charity>> {
    const { text = '', page = 1, pageSize = 20 } = query;

    // CCEW uses different endpoints for different search types
    // Default to keyword search
    const endpoint = '/allcharitydetails/GetCharitiesByKeyword';
    const params: Record<string, string | number> = {
      keyword: text,
      pageNumber: page,
      pageSize,
    };

    const queryString = this.buildQueryString(params);
    const response = await this.get<CCEWSearchResponse>(`${endpoint}${queryString}`);

    return transformSearchResponse(response.data);
  }

  /**
   * Search charities by name.
   *
   * @param name - Charity name to search for
   * @param page - Page number
   * @param pageSize - Results per page
   * @returns Paginated search results
   */
  async searchByName(
    name: string,
    page = 1,
    pageSize = 20
  ): Promise<SearchResult<Charity>> {
    const queryString = this.buildQueryString({
      charityName: name,
      pageNumber: page,
      pageSize,
    });

    const response = await this.get<CCEWSearchResponse>(
      `/allcharitydetails/GetCharitiesByName${queryString}`
    );

    return transformSearchResponse(response.data);
  }

  /**
   * Get charity details by registration number.
   *
   * Uses the GetAllCharityDetailsV2 endpoint for comprehensive data.
   *
   * @param id - Charity registration number
   * @returns Charity details or null if not found
   */
  async getCharity(id: string): Promise<Charity | null> {
    // Remove any non-numeric characters
    const regNumber = id.replace(/\D/g, '');

    // Check cache first
    const cacheKey = this.getCacheKey('getCharity', regNumber);
    const cached = this.getCached<Charity | null>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const queryString = this.buildQueryString({
        registeredCharityNumber: regNumber,
      });

      const response = await this.get<CCEWCharityDetails>(
        `/allcharitydetails/GetAllCharityDetailsV2${queryString}`
      );

      if (!response.data || !response.data.registeredCharityNumber) {
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
      if (error instanceof AuthenticationError) {
        throw error;
      }
      this.setCache(cacheKey, null);
      return null;
    }
  }

  /**
   * Get charity with linked charity number (subsidiary).
   *
   * @param regNumber - Registered charity number
   * @param linkedNumber - Linked charity number
   * @returns Charity details or null if not found
   */
  async getCharityWithLinked(
    regNumber: string,
    linkedNumber: string | number
  ): Promise<Charity | null> {
    const cleanRegNumber = regNumber.replace(/\D/g, '');

    try {
      const queryString = this.buildQueryString({
        registeredCharityNumber: cleanRegNumber,
        linkedCharityNumber: linkedNumber,
      });

      const response = await this.get<CCEWCharityDetails>(
        `/allcharitydetails/GetAllCharityDetailsV2${queryString}`
      );

      if (!response.data || !response.data.registeredCharityNumber) {
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
   * Get trustees for a charity.
   *
   * @param id - Charity registration number
   * @returns Array of trustees
   */
  async getTrustees(id: string): Promise<Trustee[]> {
    const regNumber = id.replace(/\D/g, '');

    try {
      const queryString = this.buildQueryString({
        registeredCharityNumber: regNumber,
      });

      const response = await this.get<{ trustees: CCEWTrustee[] }>(
        `/allcharitydetails/GetCharityTrusteeInformationV2${queryString}`
      );

      return transformTrustees(response.data.trustees ?? []);
    } catch {
      return [];
    }
  }

  /**
   * Get financial history for a charity.
   *
   * @param id - Charity registration number
   * @returns Array of financial years (up to 5 years)
   */
  async getFinancialHistory(id: string): Promise<FinancialYear[]> {
    const regNumber = id.replace(/\D/g, '');

    try {
      const queryString = this.buildQueryString({
        registeredCharityNumber: regNumber,
      });

      const response = await this.get<{ financialHistory: CCEWFinancialYear[] }>(
        `/allcharitydetails/GetCharityFinancialHistory${queryString}`
      );

      return transformFinancialHistory(response.data.financialHistory ?? []);
    } catch {
      return [];
    }
  }

  /**
   * Check if a charity is registered with other regulators.
   *
   * @param id - Charity registration number
   * @returns Array of other regulators with registration numbers
   */
  async getOtherRegulators(id: string): Promise<OtherRegulatorInfo[]> {
    const regNumber = id.replace(/\D/g, '');

    try {
      const queryString = this.buildQueryString({
        registeredCharityNumber: regNumber,
      });

      const response = await this.get<{ otherRegulators: { regulatorName: string; registrationNumber: string }[] }>(
        `/allcharitydetails/GetCharityOtherRegulators${queryString}`
      );

      // Map to OtherRegulatorInfo format
      return (response.data.otherRegulators ?? []).map((reg) => ({
        regulator: this.mapRegulatorName(reg.regulatorName),
        registrationNumber: reg.registrationNumber,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Map regulator name from CCEW API to Regulator type.
   */
  private mapRegulatorName(name: string): Regulator {
    const normalized = name.toLowerCase();
    if (normalized.includes('scotland') || normalized.includes('oscr')) {
      return 'OSCR';
    }
    if (normalized.includes('northern ireland') || normalized.includes('ccni')) {
      return 'CCNI';
    }
    // Default to CCEW if unknown
    return 'CCEW';
  }
}
