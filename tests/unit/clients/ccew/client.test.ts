import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CCEWClient } from '../../../../src/clients/ccew/client.js';
import type { CCEWSearchResponse, CCEWCharityDetails, CCEWTrustee, CCEWFinancialYear } from '../../../../src/types/raw/ccew.js';
import charityDetailsFixture from '../../../fixtures/ccew/charity-details.json';
import searchResponseFixture from '../../../fixtures/ccew/search-response.json';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('CCEWClient', () => {
  let client: CCEWClient;
  const testApiKey = 'test-ccew-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    client = new CCEWClient({ apiKey: testApiKey });
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
      expect(() => new CCEWClient()).toThrow('CCEW API requires an API key');
    });

    it('creates client with API key', () => {
      const newClient = new CCEWClient({ apiKey: 'my-key' });
      expect(newClient.regulator).toBe('CCEW');
    });

    it('sends Ocp-Apim-Subscription-Key header', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(searchResponseFixture as CCEWSearchResponse)
      );

      const promise = client.search({ text: 'test' });
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Ocp-Apim-Subscription-Key': testApiKey,
          }),
        })
      );
    });
  });

  describe('search', () => {
    it('searches for charities by keyword', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(searchResponseFixture as CCEWSearchResponse)
      );

      const promise = client.search({ text: 'charity' });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('GetCharitiesByKeyword'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('keyword=charity'),
        expect.any(Object)
      );
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(25);
    });

    it('supports pagination', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(searchResponseFixture as CCEWSearchResponse)
      );

      const promise = client.search({ text: 'test', page: 2, pageSize: 50 });
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageNumber=2'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=50'),
        expect.any(Object)
      );
    });

    it('uses default page and pageSize', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(searchResponseFixture as CCEWSearchResponse)
      );

      const promise = client.search({ text: 'test' });
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageNumber=1'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=20'),
        expect.any(Object)
      );
    });
  });

  describe('searchByName', () => {
    it('searches using GetCharitiesByName endpoint', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(searchResponseFixture as CCEWSearchResponse)
      );

      const promise = client.searchByName('Example Charity');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('GetCharitiesByName'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('charityName=Example+Charity'),
        expect.any(Object)
      );
      expect(result.items).toHaveLength(2);
    });

    it('accepts page and pageSize parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(searchResponseFixture as CCEWSearchResponse)
      );

      const promise = client.searchByName('Test', 3, 50);
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageNumber=3'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=50'),
        expect.any(Object)
      );
    });
  });

  describe('getCharity', () => {
    it('gets charity details by registration number', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(charityDetailsFixture as CCEWCharityDetails)
      );

      const promise = client.getCharity('1234567');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('GetAllCharityDetailsV2'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('registeredCharityNumber=1234567'),
        expect.any(Object)
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe('1234567');
      expect(result?.name).toBe('Example Charity Foundation');
    });

    it('strips non-numeric characters', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(charityDetailsFixture as CCEWCharityDetails)
      );

      const promise = client.getCharity('GB-CHC-1234567');
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('registeredCharityNumber=1234567'),
        expect.any(Object)
      );
    });

    it('returns null for non-existent charity', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      const promise = client.getCharity('9999999');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
    });

    it('returns null on 404 error', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(404, 'Not Found'));

      const promise = client.getCharity('9999999');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
    });

    it('uses cache for repeated requests', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(charityDetailsFixture as CCEWCharityDetails)
      );

      const promise1 = client.getCharity('1234567');
      await vi.runAllTimersAsync();
      const result1 = await promise1;

      const promise2 = client.getCharity('1234567');
      await vi.runAllTimersAsync();
      const result2 = await promise2;

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('caches null results', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      const promise1 = client.getCharity('9999999');
      await vi.runAllTimersAsync();
      await promise1;

      const promise2 = client.getCharity('9999999');
      await vi.runAllTimersAsync();
      await promise2;

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('re-throws AuthenticationError', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(401, 'Unauthorized'));

      const charityPromise = client.getCharity('1234567');
      // Attach rejection handler before running timers to avoid unhandled rejection
      const expectation = expect(charityPromise).rejects.toThrow('Authentication failed');
      await vi.runAllTimersAsync();
      await expectation;
    });
  });

  describe('getCharityWithLinked', () => {
    it('gets charity with linked charity number', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(charityDetailsFixture as CCEWCharityDetails)
      );

      const promise = client.getCharityWithLinked('1234567', 1);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('linkedCharityNumber=1'),
        expect.any(Object)
      );
      expect(result).not.toBeNull();
    });

    it('returns null for non-existent linked charity', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      const promise = client.getCharityWithLinked('1234567', 999);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
    });
  });

  describe('getTrustees', () => {
    it('fetches trustees from dedicated endpoint', async () => {
      const trusteesResponse = {
        trustees: [
          {
            trusteeName: 'Dr. Sarah Johnson',
            trusteeIsChair: true,
            trusteeReportingStatus: 'Active',
            trusteeApptDate: '2015-01-01T00:00:00',
            trusteeCessDate: null,
          },
          {
            trusteeName: 'Mr. James Wilson',
            trusteeIsChair: false,
            trusteeReportingStatus: 'Active',
            trusteeApptDate: '2018-06-15T00:00:00',
            trusteeCessDate: null,
          },
        ] as CCEWTrustee[],
      };

      mockFetch.mockResolvedValueOnce(mockSuccessResponse(trusteesResponse));

      const promise = client.getTrustees('1234567');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('GetCharityTrusteeInformationV2'),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Dr. Sarah Johnson');
      expect(result[0].isChair).toBe(true);
    });

    it('returns empty array on error', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(500, 'Server Error'));

      const promise = client.getTrustees('1234567');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([]);
    });

    it('returns empty array when no trustees', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({ trustees: null }));

      const promise = client.getTrustees('1234567');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([]);
    });
  });

  describe('getFinancialHistory', () => {
    it('fetches financial history from dedicated endpoint', async () => {
      const financialResponse = {
        financialHistory: [
          {
            financialYearEnd: '2023-03-31T00:00:00',
            income: 500000,
            expenditure: 450000,
          },
          {
            financialYearEnd: '2022-03-31T00:00:00',
            income: 480000,
            expenditure: 420000,
          },
        ] as CCEWFinancialYear[],
      };

      mockFetch.mockResolvedValueOnce(mockSuccessResponse(financialResponse));

      const promise = client.getFinancialHistory('1234567');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('GetCharityFinancialHistory'),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
      expect(result[0].income).toBe(500000);
      expect(result[0].expenditure).toBe(450000);
      expect(result[0].yearEnd).toBeInstanceOf(Date);
    });

    it('returns empty array on error', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(500, 'Server Error'));

      const promise = client.getFinancialHistory('1234567');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([]);
    });

    it('returns empty array when no financial history', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ financialHistory: null })
      );

      const promise = client.getFinancialHistory('1234567');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([]);
    });
  });

  describe('getOtherRegulators', () => {
    it('fetches other regulators from dedicated endpoint', async () => {
      const regulatorsResponse = {
        otherRegulators: [
          {
            regulatorName: 'Office of the Scottish Charity Regulator (OSCR)',
            registrationNumber: 'SC123456',
          },
          {
            regulatorName: 'Charity Commission for Northern Ireland',
            registrationNumber: 'NIC100123',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(mockSuccessResponse(regulatorsResponse));

      const promise = client.getOtherRegulators('1234567');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('GetCharityOtherRegulators'),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
      expect(result[0].regulator).toBe('OSCR');
      expect(result[0].registrationNumber).toBe('SC123456');
      expect(result[1].regulator).toBe('CCNI');
      expect(result[1].registrationNumber).toBe('NIC100123');
    });

    it('maps Scotland to OSCR', async () => {
      const regulatorsResponse = {
        otherRegulators: [
          { regulatorName: 'Scotland', registrationNumber: 'SC000001' },
        ],
      };

      mockFetch.mockResolvedValueOnce(mockSuccessResponse(regulatorsResponse));

      const promise = client.getOtherRegulators('1234567');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result[0].regulator).toBe('OSCR');
    });

    it('maps Northern Ireland to CCNI', async () => {
      const regulatorsResponse = {
        otherRegulators: [
          { regulatorName: 'Northern Ireland', registrationNumber: 'NIC100001' },
        ],
      };

      mockFetch.mockResolvedValueOnce(mockSuccessResponse(regulatorsResponse));

      const promise = client.getOtherRegulators('1234567');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result[0].regulator).toBe('CCNI');
    });

    it('defaults unknown regulators to CCEW', async () => {
      const regulatorsResponse = {
        otherRegulators: [
          { regulatorName: 'Unknown Regulator', registrationNumber: '123456' },
        ],
      };

      mockFetch.mockResolvedValueOnce(mockSuccessResponse(regulatorsResponse));

      const promise = client.getOtherRegulators('1234567');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result[0].regulator).toBe('CCEW');
    });

    it('returns empty array on error', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(500, 'Server Error'));

      const promise = client.getOtherRegulators('1234567');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([]);
    });

    it('returns empty array when no other regulators', async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ otherRegulators: null })
      );

      const promise = client.getOtherRegulators('1234567');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([]);
    });
  });

  describe('clearCache', () => {
    it('clears cached entries', async () => {
      mockFetch.mockResolvedValue(
        mockSuccessResponse(charityDetailsFixture as CCEWCharityDetails)
      );

      const promise1 = client.getCharity('1234567');
      await vi.runAllTimersAsync();
      await promise1;

      client.clearCache();

      const promise2 = client.getCharity('1234567');
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
      const uncachedClient = new CCEWClient({
        apiKey: testApiKey,
        cache: { enabled: false },
      });

      mockFetch.mockResolvedValue(
        mockSuccessResponse(charityDetailsFixture as CCEWCharityDetails)
      );

      const promise1 = uncachedClient.getCharity('1234567');
      await vi.runAllTimersAsync();
      await promise1;

      const promise2 = uncachedClient.getCharity('1234567');
      await vi.runAllTimersAsync();
      await promise2;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
