import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CCNIClient } from '../../../../src/clients/ccni/client.js';
import type { CCNICharityDetails, CCNISearchResponse } from '../../../../src/types/raw/ccni.js';
import charityDetailsFixture from '../../../fixtures/ccni/charity-details.json';
import searchResponseFixture from '../../../fixtures/ccni/search-response.json';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('CCNIClient', () => {
  let client: CCNIClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    client = new CCNIClient();
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
    it('creates client without API key', () => {
      const newClient = new CCNIClient();
      expect(newClient.regulator).toBe('CCNI');
    });

    it('accepts custom configuration', () => {
      const newClient = new CCNIClient({
        timeout: 5000,
        retryAttempts: 1,
      });
      expect(newClient.regulator).toBe('CCNI');
    });

    it('accepts cache configuration', () => {
      const newClient = new CCNIClient({
        cache: { enabled: true, ttl: 60000, maxSize: 50 },
      });
      expect(newClient.regulator).toBe('CCNI');
    });

    it('can disable caching', () => {
      const newClient = new CCNIClient({
        cache: { enabled: false },
      });
      expect(newClient.regulator).toBe('CCNI');
    });
  });

  describe('search', () => {
    it('searches for charities with text query', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(searchResponseFixture as CCNISearchResponse)
      );

      const promise = client.search({ text: 'cancer' });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('getSearchResults'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('searchText=cancer'),
        expect.any(Object)
      );
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
    });

    it('searches with pagination', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(searchResponseFixture as CCNISearchResponse)
      );

      const promise = client.search({ text: '', page: 2 });
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageNumber=2'),
        expect.any(Object)
      );
    });

    it('searches with filters', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(searchResponseFixture as CCNISearchResponse)
      );

      const promise = client.search({
        text: 'test',
        filters: {
          onlyShow: 'Up-to-date',
          income: 'Under £10K',
        },
      });
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('onlyShow=Up-to-date'),
        expect.any(Object)
      );
    });

    it('handles empty search', async () => {
      const emptyResponse: CCNISearchResponse = {
        pageNumber: 1,
        pageSize: 15,
        totalPages: 0,
        totalItems: 0,
        pageItems: [],
        aggregationGroups: [],
        onlyShow: null,
      };

      mockFetch.mockResolvedValueOnce(mockSuccessResponse(emptyResponse));

      const promise = client.search({ text: 'nonexistent' });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('searchByName', () => {
    it('delegates to search with text parameter', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(searchResponseFixture as CCNISearchResponse)
      );

      const promise = client.searchByName('Cancer Lifeline');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('searchText=Cancer+Lifeline'),
        expect.any(Object)
      );
      expect(result.items).toHaveLength(2);
    });

    it('accepts page parameter', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(searchResponseFixture as CCNISearchResponse)
      );

      const promise = client.searchByName('Test Charity', 3);
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageNumber=3'),
        expect.any(Object)
      );
    });
  });

  describe('getCharity', () => {
    it('gets charity details by registration number', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(charityDetailsFixture as CCNICharityDetails)
      );

      const promise = client.getCharity('100002');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('regId=100002'),
        expect.any(Object)
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe('NIC100002');
      expect(result?.name).toBe('Cancer Lifeline');
    });

    it('strips NIC prefix from ID', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(charityDetailsFixture as CCNICharityDetails)
      );

      const promise = client.getCharity('NIC100002');
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('regId=100002'),
        expect.any(Object)
      );
    });

    it('returns null for non-existent charity', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      const promise = client.getCharity('999999');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
    });

    it('returns null on 404 error', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(404, 'Not Found'));

      const promise = client.getCharity('999999');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
    });

    it('uses cache for repeated requests', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(charityDetailsFixture as CCNICharityDetails)
      );

      const promise1 = client.getCharity('100002');
      await vi.runAllTimersAsync();
      const result1 = await promise1;

      // Second call should use cache
      const promise2 = client.getCharity('100002');
      await vi.runAllTimersAsync();
      const result2 = await promise2;

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('caches null results', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      const promise1 = client.getCharity('999999');
      await vi.runAllTimersAsync();
      const result1 = await promise1;

      const promise2 = client.getCharity('999999');
      await vi.runAllTimersAsync();
      const result2 = await promise2;

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('getCharityWithSubsidiary', () => {
    it('gets charity with subsidiary number', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(charityDetailsFixture as CCNICharityDetails)
      );

      const promise = client.getCharityWithSubsidiary('100002', 1);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('subId=1'),
        expect.any(Object)
      );
      expect(result).not.toBeNull();
    });

    it('returns null for non-existent subsidiary', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      const promise = client.getCharityWithSubsidiary('100002', 999);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
    });
  });

  describe('getTrustees', () => {
    it('returns trustees from charity details', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(charityDetailsFixture as CCNICharityDetails)
      );

      const promise = client.getTrustees('100002');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Smith');
      expect(result[0].isChair).toBe(true);
      expect(result[1].name).toBe('Jane Doe');
      expect(result[1].isChair).toBe(false);
    });

    it('returns empty array for non-existent charity', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      const promise = client.getTrustees('999999');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([]);
    });

    it('returns empty array when no trustees', async () => {
      const charityWithoutTrustees = {
        ...charityDetailsFixture,
        trusteesList: null,
      };
      mockFetch.mockResolvedValueOnce(mockSuccessResponse(charityWithoutTrustees));

      const promise = client.getTrustees('100002');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([]);
    });
  });

  describe('getFinancialHistory', () => {
    it('returns current year financial data', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(charityDetailsFixture as CCNICharityDetails)
      );

      const promise = client.getFinancialHistory('100002');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toHaveLength(1);
      expect(result[0].income).toBe(150000);
      expect(result[0].expenditure).toBe(120000);
      expect(result[0].yearEnd).toBeInstanceOf(Date);
    });

    it('returns empty array for non-existent charity', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      const promise = client.getFinancialHistory('999999');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([]);
    });

    it('returns empty array when no financial year end', async () => {
      const charityWithoutFinancials = {
        ...charityDetailsFixture,
        dateFinancialYearEnd: null,
      };
      mockFetch.mockResolvedValueOnce(mockSuccessResponse(charityWithoutFinancials));

      const promise = client.getFinancialHistory('100002');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([]);
    });
  });

  describe('getOtherRegulators', () => {
    it('returns empty array and logs not implemented', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await client.getOtherRegulators('100002');

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CCNI] getOtherRegulators is not supported')
      );

      warnSpy.mockRestore();
    });
  });

  describe('clearCache', () => {
    it('clears cached entries', async () => {
      mockFetch.mockResolvedValue(
        mockSuccessResponse(charityDetailsFixture as CCNICharityDetails)
      );

      // First request
      const promise1 = client.getCharity('100002');
      await vi.runAllTimersAsync();
      await promise1;

      // Clear cache
      client.clearCache();

      // Second request should hit API again
      const promise2 = client.getCharity('100002');
      await vi.runAllTimersAsync();
      await promise2;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('throws AuthenticationError on 401', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(401, 'Unauthorized'));

      const searchPromise = client.search({ text: 'test' });
      // Attach rejection handler before running timers to avoid unhandled rejection
      const expectation = expect(searchPromise).rejects.toThrow('Authentication failed');
      await vi.runAllTimersAsync();
      await expectation;
    });

    it('throws AuthenticationError on 403', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(403, 'Forbidden'));

      const searchPromise = client.search({ text: 'test' });
      const expectation = expect(searchPromise).rejects.toThrow('Authentication failed');
      await vi.runAllTimersAsync();
      await expectation;
    });

    it('throws RateLimitError on 429', async () => {
      // Mock multiple 429 responses to exhaust retries
      mockFetch
        .mockResolvedValueOnce(mockErrorResponse(429, 'Too Many Requests'))
        .mockResolvedValueOnce(mockErrorResponse(429, 'Too Many Requests'))
        .mockResolvedValueOnce(mockErrorResponse(429, 'Too Many Requests'))
        .mockResolvedValueOnce(mockErrorResponse(429, 'Too Many Requests'));

      const searchPromise = client.search({ text: 'test' });
      const expectation = expect(searchPromise).rejects.toThrow('Rate limit exceeded');
      await vi.runAllTimersAsync();
      await expectation;
    });
  });

  describe('caching disabled', () => {
    it('does not cache when caching is disabled', async () => {
      const uncachedClient = new CCNIClient({
        cache: { enabled: false },
      });

      mockFetch.mockResolvedValue(
        mockSuccessResponse(charityDetailsFixture as CCNICharityDetails)
      );

      const promise1 = uncachedClient.getCharity('100002');
      await vi.runAllTimersAsync();
      await promise1;

      const promise2 = uncachedClient.getCharity('100002');
      await vi.runAllTimersAsync();
      await promise2;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
