import { BaseClient } from '../../core/base-client.js';
import type { Charity, FinancialYear, Regulator } from '../../types/charity.js';
import type { SearchQuery, SearchResult, ClientConfig } from '../../types/search.js';
import type { OSCRAllCharitiesResponse, OSCRAnnualReturn, OSCRCharity } from '../../types/raw/oscr.js';
import {
  transformCharity,
  transformAllCharitiesResponse,
  transformAnnualReturns,
  enrichCharityWithAnnualReturn,
} from './transform.js';
import { AuthenticationError } from '../../core/errors.js';

/**
 * OSCR API base URL.
 */
const OSCR_BASE_URL = 'https://oscrapi.azurewebsites.net/api';

/**
 * Client for the Office of the Scottish Charity Regulator (OSCR) API.
 *
 * Requires an API key (`x-functions-key` header).
 *
 * @example
 * ```typescript
 * const client = new OSCRClient({ apiKey: process.env.OSCR_API_KEY });
 *
 * // Search for charities (paginated)
 * const results = await client.search({ page: 1 });
 *
 * // Get charity by number
 * const charity = await client.getCharity('SC000001');
 *
 * // Get annual returns
 * const returns = await client.getAnnualReturns('SC000001');
 * ```
 */
export class OSCRClient extends BaseClient {
  readonly regulator: Regulator = 'OSCR';

  constructor(config: ClientConfig = {}) {
    super(config);

    if (!this.apiKey) {
      throw new Error('OSCR API requires an API key. Provide it via the apiKey config option.');
    }
  }

  protected getDefaultBaseUrl(): string {
    return OSCR_BASE_URL;
  }

  protected getAuthHeaders(): Record<string, string> {
    if (!this.apiKey) {
      return {};
    }
    return {
      'x-functions-key': this.apiKey,
    };
  }

  /**
   * Get all charities (paginated).
   *
   * Note: OSCR doesn't support text search. Use page parameter for pagination.
   *
   * @param query - Search parameters (only page is used)
   * @returns Paginated list of charities
   */
  async search(query: SearchQuery = {}): Promise<SearchResult<Charity>> {
    const { page = 1 } = query;

    const queryString = this.buildQueryString({ page });
    const response = await this.get<OSCRAllCharitiesResponse>(`/all_charities${queryString}`);

    return transformAllCharitiesResponse(response.data);
  }

  /**
   * Get a charity by its Scottish charity number.
   *
   * @param id - Scottish charity number (e.g., 'SC000001')
   * @returns Charity details or null if not found
   */
  async getCharity(id: string): Promise<Charity | null> {
    // Ensure SC prefix
    const charityNumber = id.toUpperCase().startsWith('SC') ? id.toUpperCase() : `SC${id}`;

    try {
      const queryString = this.buildQueryString({ charitynumber: charityNumber });
      const response = await this.get<OSCRAllCharitiesResponse>(`/all_charities${queryString}`);

      const firstCharity = response.data.data?.[0];
      if (!firstCharity) {
        return null;
      }

      return transformCharity(firstCharity);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Get charity with enriched data from annual returns.
   *
   * Makes two API calls: one for charity details, one for annual returns.
   *
   * @param id - Scottish charity number
   * @returns Enriched charity details or null if not found
   */
  async getCharityWithFinancials(id: string): Promise<Charity | null> {
    const charity = await this.getCharity(id);

    if (!charity) {
      return null;
    }

    const annualReturns = await this.getAnnualReturns(id);

    if (annualReturns.length > 0) {
      const raw = charity._raw as OSCRCharity;
      const latestReturn = await this.getLatestAnnualReturnRaw(raw.id);

      if (latestReturn) {
        return enrichCharityWithAnnualReturn(charity, latestReturn);
      }
    }

    return charity;
  }

  /**
   * Get annual returns for a charity.
   *
   * Note: Requires the internal UUID from the charity record, not the SC number.
   *
   * @param id - Scottish charity number
   * @returns Array of financial years
   */
  async getAnnualReturns(id: string): Promise<FinancialYear[]> {
    const charity = await this.getCharity(id);

    if (!charity) {
      return [];
    }

    const raw = charity._raw as OSCRCharity;
    const response = await this.getAnnualReturnsById(raw.id);

    return transformAnnualReturns(response);
  }

  /**
   * Get annual returns by internal charity UUID.
   *
   * @param charityId - Internal UUID from OSCRCharity.id
   * @returns Array of annual return records
   */
  private async getAnnualReturnsById(charityId: string): Promise<OSCRAnnualReturn[]> {
    try {
      const queryString = this.buildQueryString({ charityid: charityId });
      const response = await this.get<OSCRAnnualReturn[]>(`/annualreturns${queryString}`);

      return response.data ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Get the most recent annual return (raw format).
   */
  private async getLatestAnnualReturnRaw(charityId: string): Promise<OSCRAnnualReturn | null> {
    const returns = await this.getAnnualReturnsById(charityId);

    if (returns.length === 0) {
      return null;
    }

    // Sort by date descending and get first
    const sorted = returns.sort((a, b) =>
      new Date(b.AccountingReferenceDate).getTime() - new Date(a.AccountingReferenceDate).getTime()
    );

    return sorted[0] ?? null;
  }
}
