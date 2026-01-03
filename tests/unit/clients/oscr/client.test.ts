import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OSCRClient } from '../../../../src/clients/oscr/client.js';
import type { OSCRAllCharitiesResponse, OSCRAnnualReturn } from '../../../../src/types/raw/oscr.js';
import allCharitiesFixture from '../../../fixtures/oscr/all-charities-response.json';
import charityFixture from '../../../fixtures/oscr/charity.json';
import annualReturnsFixture from '../../../fixtures/oscr/annual-returns.json';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('OSCRClient', () => {
  let client: OSCRClient;
  const testApiKey = 'test-oscr-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    client = new OSCRClient({ apiKey: testApiKey });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockSuccessResponse = <T>(data: T) => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    text: () => Promise.resolve(JSON.stringify(data)),
  });

  const mockErrorResponse = (status: number, statusText: string) => ({
    ok: false,
    status,
    statusText,
    headers: new Headers(),
    text: () => Promise.resolve(statusText),
  });

  describe('constructor', () => {
    it('throws error without API key', () => {
      expect(() => new OSCRClient()).toThrow('OSCR API requires an API key');
    });

    it('creates client with API key', () => {
      const newClient = new OSCRClient({ apiKey: 'my-key' });
      expect(newClient.regulator).toBe('OSCR');
    });

    it('sends x-functions-key header', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(allCharitiesFixture as OSCRAllCharitiesResponse)
      );

      const promise = client.search({});
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-functions-key': testApiKey,
          }),
        })
      );
    });
  });

  describe('search', () => {
    it('fetches all charities with pagination', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(allCharitiesFixture as OSCRAllCharitiesResponse)
      );

      const promise = client.search({ page: 1 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('all_charities'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.any(Object)
      );
      expect(result.items).toHaveLength(2);
      expect(result.totalPages).toBe(250);
    });

    it('defaults to page 1', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(allCharitiesFixture as OSCRAllCharitiesResponse)
      );

      const promise = client.search({});
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.any(Object)
      );
    });

    it('ignores text search parameter (not supported)', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(allCharitiesFixture as OSCRAllCharitiesResponse)
      );

      const promise = client.search({ text: 'wildlife' });
      await vi.runAllTimersAsync();
      const result = await promise;

      // Text search is not supported, but request should still work
      expect(result.items).toHaveLength(2);
    });
  });

  describe('searchByName', () => {
    it('returns empty results and logs not implemented', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await client.searchByName('Test Charity');

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OSCR] searchByName is not supported')
      );

      warnSpy.mockRestore();
    });

    it('preserves page parameter in empty result', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await client.searchByName('Test Charity', 5);

      expect(result.page).toBe(5);

      warnSpy.mockRestore();
    });
  });

  describe('getCharity', () => {
    it('gets charity by SC number', async () => {
      const charityResponse: OSCRAllCharitiesResponse = {
        currentPage: 1,
        totalPages: 1,
        prev: null,
        next: null,
        data: [charityFixture],
      };

      mockFetch.mockResolvedValueOnce(mockSuccessResponse(charityResponse));

      const promise = client.getCharity('SC000001');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('charitynumber=SC000001'),
        expect.any(Object)
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe('SC000001');
      expect(result?.name).toBe('Stoneyburn Community Education Centre');
    });

    it('adds SC prefix if missing', async () => {
      const charityResponse: OSCRAllCharitiesResponse = {
        currentPage: 1,
        totalPages: 1,
        prev: null,
        next: null,
        data: [charityFixture],
      };

      mockFetch.mockResolvedValueOnce(mockSuccessResponse(charityResponse));

      const promise = client.getCharity('000001');
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('charitynumber=SC000001'),
        expect.any(Object)
      );
    });

    it('uppercases SC prefix', async () => {
      const charityResponse: OSCRAllCharitiesResponse = {
        currentPage: 1,
        totalPages: 1,
        prev: null,
        next: null,
        data: [charityFixture],
      };

      mockFetch.mockResolvedValueOnce(mockSuccessResponse(charityResponse));

      const promise = client.getCharity('sc000001');
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('charitynumber=SC000001'),
        expect.any(Object)
      );
    });

    it('returns null for non-existent charity', async () => {
      const emptyResponse: OSCRAllCharitiesResponse = {
        currentPage: 1,
        totalPages: 0,
        prev: null,
        next: null,
        data: [],
      };

      mockFetch.mockResolvedValueOnce(mockSuccessResponse(emptyResponse));

      const promise = client.getCharity('SC999999');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
    });

    it('uses cache for repeated requests', async () => {
      const charityResponse: OSCRAllCharitiesResponse = {
        currentPage: 1,
        totalPages: 1,
        prev: null,
        next: null,
        data: [charityFixture],
      };

      mockFetch.mockResolvedValueOnce(mockSuccessResponse(charityResponse));

      const promise1 = client.getCharity('SC000001');
      await vi.runAllTimersAsync();
      const result1 = await promise1;

      const promise2 = client.getCharity('SC000001');
      await vi.runAllTimersAsync();
      const result2 = await promise2;

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('caches null results', async () => {
      const emptyResponse: OSCRAllCharitiesResponse = {
        currentPage: 1,
        totalPages: 0,
        prev: null,
        next: null,
        data: [],
      };

      mockFetch.mockResolvedValueOnce(mockSuccessResponse(emptyResponse));

      const promise1 = client.getCharity('SC999999');
      await vi.runAllTimersAsync();
      await promise1;

      const promise2 = client.getCharity('SC999999');
      await vi.runAllTimersAsync();
      await promise2;

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTrustees', () => {
    it('returns empty array and logs not implemented', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await client.getTrustees('SC000001');

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OSCR] getTrustees is not supported')
      );

      warnSpy.mockRestore();
    });
  });

  describe('getAnnualReturns', () => {
    it('fetches annual returns for charity', async () => {
      const charityResponse: OSCRAllCharitiesResponse = {
        currentPage: 1,
        totalPages: 1,
        prev: null,
        next: null,
        data: [charityFixture],
      };

      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse(charityResponse))
        .mockResolvedValueOnce(
          mockSuccessResponse(annualReturnsFixture as OSCRAnnualReturn[])
        );

      const promise = client.getAnnualReturns('SC000001');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toHaveLength(2);
      expect(result[0].income).toBe(85000);
      expect(result[0].expenditure).toBe(78000);
    });

    it('returns empty array for non-existent charity', async () => {
      const emptyResponse: OSCRAllCharitiesResponse = {
        currentPage: 1,
        totalPages: 0,
        prev: null,
        next: null,
        data: [],
      };

      mockFetch.mockResolvedValueOnce(mockSuccessResponse(emptyResponse));

      const promise = client.getAnnualReturns('SC999999');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([]);
    });
  });

  describe('getFinancialHistory', () => {
    it('delegates to getAnnualReturns', async () => {
      const charityResponse: OSCRAllCharitiesResponse = {
        currentPage: 1,
        totalPages: 1,
        prev: null,
        next: null,
        data: [charityFixture],
      };

      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse(charityResponse))
        .mockResolvedValueOnce(
          mockSuccessResponse(annualReturnsFixture as OSCRAnnualReturn[])
        );

      const promise = client.getFinancialHistory('SC000001');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toHaveLength(2);
      expect(result[0].yearEnd).toBeInstanceOf(Date);
    });
  });

  describe('getCharityWithFinancials', () => {
    it('enriches charity with annual return data', async () => {
      const charityResponse: OSCRAllCharitiesResponse = {
        currentPage: 1,
        totalPages: 1,
        prev: null,
        next: null,
        data: [charityFixture],
      };

      // Mock chain:
      // 1. getCharity -> all_charities with charitynumber
      // 2. getAnnualReturns -> getCharity (cached) + annualreturns endpoint
      // 3. getLatestAnnualReturnRaw -> annualreturns endpoint
      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse(charityResponse)) // getCharity
        .mockResolvedValueOnce(
          mockSuccessResponse(annualReturnsFixture as OSCRAnnualReturn[])
        ) // getAnnualReturns -> getAnnualReturnsById
        .mockResolvedValueOnce(
          mockSuccessResponse(annualReturnsFixture as OSCRAnnualReturn[])
        ); // getLatestAnnualReturnRaw -> getAnnualReturnsById

      const promise = client.getCharityWithFinancials('SC000001');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).not.toBeNull();
      expect(result?.employeeCount).toBe(3); // From annual return
    });

    it('returns null for non-existent charity', async () => {
      const emptyResponse: OSCRAllCharitiesResponse = {
        currentPage: 1,
        totalPages: 0,
        prev: null,
        next: null,
        data: [],
      };

      mockFetch.mockResolvedValueOnce(mockSuccessResponse(emptyResponse));

      const promise = client.getCharityWithFinancials('SC999999');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
    });

    it('returns charity without enrichment when no annual returns', async () => {
      const charityResponse: OSCRAllCharitiesResponse = {
        currentPage: 1,
        totalPages: 1,
        prev: null,
        next: null,
        data: [charityFixture],
      };

      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse(charityResponse)) // getCharity
        .mockResolvedValueOnce(mockSuccessResponse([])); // empty annual returns

      const promise = client.getCharityWithFinancials('SC000001');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Stoneyburn Community Education Centre');
    });
  });

  describe('getOtherRegulators', () => {
    it('returns empty array and logs not implemented', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await client.getOtherRegulators('SC000001');

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OSCR] getOtherRegulators is not supported')
      );

      warnSpy.mockRestore();
    });
  });

  describe('clearCache', () => {
    it('clears cached entries', async () => {
      const charityResponse: OSCRAllCharitiesResponse = {
        currentPage: 1,
        totalPages: 1,
        prev: null,
        next: null,
        data: [charityFixture],
      };

      mockFetch.mockResolvedValue(mockSuccessResponse(charityResponse));

      const promise1 = client.getCharity('SC000001');
      await vi.runAllTimersAsync();
      await promise1;

      client.clearCache();

      const promise2 = client.getCharity('SC000001');
      await vi.runAllTimersAsync();
      await promise2;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('throws AuthenticationError on 401', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(401, 'Unauthorized'));

      const searchPromise = client.search({});
      // Attach rejection handler before running timers to avoid unhandled rejection
      const expectation = expect(searchPromise).rejects.toThrow('Authentication failed');
      await vi.runAllTimersAsync();
      await expectation;
    });

    it('re-throws AuthenticationError in getCharity', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(401, 'Unauthorized'));

      const charityPromise = client.getCharity('SC000001');
      const expectation = expect(charityPromise).rejects.toThrow('Authentication failed');
      await vi.runAllTimersAsync();
      await expectation;
    });
  });

  describe('caching disabled', () => {
    it('does not cache when caching is disabled', async () => {
      const uncachedClient = new OSCRClient({
        apiKey: testApiKey,
        cache: { enabled: false },
      });

      const charityResponse: OSCRAllCharitiesResponse = {
        currentPage: 1,
        totalPages: 1,
        prev: null,
        next: null,
        data: [charityFixture],
      };

      mockFetch.mockResolvedValue(mockSuccessResponse(charityResponse));

      const promise1 = uncachedClient.getCharity('SC000001');
      await vi.runAllTimersAsync();
      await promise1;

      const promise2 = uncachedClient.getCharity('SC000001');
      await vi.runAllTimersAsync();
      await promise2;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
