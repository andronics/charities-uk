import { describe, it, expect } from 'vitest';
import {
  transformDetails,
  transformSummary,
  transformSearchResponse,
  transformTrustee,
  transformTrustees,
  transformFinancialYear,
  transformFinancialHistory,
} from '../../../../src/clients/ccew/transform.js';
import type {
  CCEWCharityDetails,
  CCEWCharitySummary,
  CCEWSearchResponse,
  CCEWTrustee,
  CCEWFinancialYear,
} from '../../../../src/types/raw/ccew.js';
import charityDetailsFixture from '../../../fixtures/ccew/charity-details.json';
import searchResponseFixture from '../../../fixtures/ccew/search-response.json';

describe('CCEW transform functions', () => {
  describe('transformDetails', () => {
    const details = charityDetailsFixture as CCEWCharityDetails;

    it('transforms charity identifiers correctly', () => {
      const result = transformDetails(details);

      expect(result.id).toBe('1234567');
      expect(result.regulator).toBe('CCEW');
      expect(result.registrationNumber).toBe('1234567');
      expect(result.subsidiaryNumber).toBeUndefined(); // linkedCharityNumber is 0
      expect(result.companyNumber).toBe('12345678');
    });

    it('transforms core info correctly', () => {
      const result = transformDetails(details);

      expect(result.name).toBe('Example Charity Foundation');
      expect(result.otherNames).toEqual(['ECF']);
      expect(result.status).toBe('ACTIVE');
      expect(result.registeredDate).toBeInstanceOf(Date);
      expect(result.removedDate).toBeNull();
    });

    it('transforms contact info correctly', () => {
      const result = transformDetails(details);

      expect(result.website).toBe('https://www.examplecharity.org.uk');
      expect(result.email).toBe('info@examplecharity.org.uk');
      expect(result.phone).toBe('020 1234 5678');
      expect(result.address).toBe('123 High Street, Westminster, London, SW1A 1AA');
    });

    it('transforms financial info correctly', () => {
      const result = transformDetails(details);

      expect(result.latestIncome).toBe(500000);
      expect(result.latestExpenditure).toBe(450000);
      expect(result.financialYearEnd).toBeInstanceOf(Date);
    });

    it('transforms people counts correctly', () => {
      const result = transformDetails(details);

      expect(result.employeeCount).toBe(15);
      expect(result.volunteerCount).toBe(50);
      expect(result.trusteeCount).toBe(10);
    });

    it('transforms classification correctly', () => {
      const result = transformDetails(details);

      expect(result.purposes).toContain('General charitable purposes');
      expect(result.purposes).toContain('Education/training');
      expect(result.beneficiaries).toContain('Children/young people');
      expect(result.activities).toContain('Makes grants to organisations');
      expect(result.areasOfOperation).toContain('London');
      expect(result.areasOfOperation).toContain('England');
    });

    it('transforms governance info correctly', () => {
      const result = transformDetails(details);

      expect(result.organisationType).toBe('Charitable Incorporated Organisation');
      expect(result.governingDocumentType).toBe('Charitable Incorporated Organisation Constitution');
    });

    it('transforms extended text correctly', () => {
      const result = transformDetails(details);

      expect(result.charitableObjects).toContain('advance education');
    });

    it('includes raw data', () => {
      const result = transformDetails(details);

      expect(result._raw).toBe(details);
    });

    it('handles linked charity number', () => {
      const detailsWithLinked = { ...details, linkedCharityNumber: 1 };
      const result = transformDetails(detailsWithLinked);

      expect(result.subsidiaryNumber).toBe('1');
    });
  });

  describe('transformSummary', () => {
    const summary: CCEWCharitySummary = {
      registeredCharityNumber: 1234567,
      linkedCharityNumber: 0,
      charityName: 'Example Charity Foundation',
      charityType: 'CIO',
      registrationStatus: 'Registered',
      dateOfRegistration: '2005-03-15T00:00:00',
      dateOfRemoval: null,
    };

    it('transforms identifiers correctly', () => {
      const result = transformSummary(summary);

      expect(result.id).toBe('1234567');
      expect(result.regulator).toBe('CCEW');
      expect(result.registrationNumber).toBe('1234567');
    });

    it('transforms basic info correctly', () => {
      const result = transformSummary(summary);

      expect(result.name).toBe('Example Charity Foundation');
      expect(result.status).toBe('ACTIVE');
      expect(result.organisationType).toBe('CIO');
    });

    it('has null values for unavailable fields', () => {
      const result = transformSummary(summary);

      expect(result.website).toBeNull();
      expect(result.email).toBeNull();
      expect(result.latestIncome).toBeNull();
      expect(result.employeeCount).toBeNull();
      expect(result.purposes).toEqual([]);
    });
  });

  describe('transformSearchResponse', () => {
    const searchResponse = searchResponseFixture as CCEWSearchResponse;

    it('transforms pagination correctly', () => {
      const result = transformSearchResponse(searchResponse);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(2); // ceil(25/20)
    });

    it('transforms items correctly', () => {
      const result = transformSearchResponse(searchResponse);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('1234567');
      expect(result.items[1].id).toBe('7654321');
    });

    it('has no aggregations', () => {
      const result = transformSearchResponse(searchResponse);

      expect(result.aggregations).toBeUndefined();
    });
  });

  describe('transformTrustee', () => {
    const trustee: CCEWTrustee = {
      trusteeName: 'Dr. Sarah Johnson',
      trusteeIsChair: true,
      trusteeReportingStatus: 'Active',
      trusteeApptDate: '2015-01-01T00:00:00',
      trusteeCessDate: null,
    };

    it('transforms trustee correctly', () => {
      const result = transformTrustee(trustee);

      expect(result.name).toBe('Dr. Sarah Johnson');
      expect(result.isChair).toBe(true);
      expect(result.otherTrusteeships).toBeUndefined();
    });
  });

  describe('transformTrustees', () => {
    it('transforms array of trustees', () => {
      const trustees: CCEWTrustee[] = [
        {
          trusteeName: 'Dr. Sarah Johnson',
          trusteeIsChair: true,
          trusteeReportingStatus: 'Active',
          trusteeApptDate: null,
          trusteeCessDate: null,
        },
        {
          trusteeName: 'Mr. James Wilson',
          trusteeIsChair: false,
          trusteeReportingStatus: 'Active',
          trusteeApptDate: null,
          trusteeCessDate: null,
        },
      ];

      const result = transformTrustees(trustees);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Dr. Sarah Johnson');
      expect(result[0].isChair).toBe(true);
      expect(result[1].name).toBe('Mr. James Wilson');
      expect(result[1].isChair).toBe(false);
    });
  });

  describe('transformFinancialYear', () => {
    const financialYear: CCEWFinancialYear = {
      financialYearEnd: '2023-03-31T00:00:00',
      income: 500000,
      expenditure: 450000,
    };

    it('transforms financial year correctly', () => {
      const result = transformFinancialYear(financialYear);

      expect(result.yearEnd).toBeInstanceOf(Date);
      expect(result.income).toBe(500000);
      expect(result.expenditure).toBe(450000);
    });
  });

  describe('transformFinancialHistory', () => {
    const financialHistory: CCEWFinancialYear[] = [
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
    ];

    it('transforms array of financial years', () => {
      const result = transformFinancialHistory(financialHistory);

      expect(result).toHaveLength(2);
      expect(result[0].income).toBe(500000);
      expect(result[1].income).toBe(480000);
    });
  });

  describe('status mapping', () => {
    it('maps Registered to ACTIVE', () => {
      const summary: CCEWCharitySummary = {
        registeredCharityNumber: 1,
        linkedCharityNumber: 0,
        charityName: 'Test',
        charityType: 'Trust',
        registrationStatus: 'Registered',
        dateOfRegistration: '2020-01-01',
        dateOfRemoval: null,
      };
      expect(transformSummary(summary).status).toBe('ACTIVE');
    });

    it('maps Removed to REMOVED', () => {
      const summary: CCEWCharitySummary = {
        registeredCharityNumber: 1,
        linkedCharityNumber: 0,
        charityName: 'Test',
        charityType: 'Trust',
        registrationStatus: 'Removed',
        dateOfRegistration: '2020-01-01',
        dateOfRemoval: '2023-01-01',
      };
      expect(transformSummary(summary).status).toBe('REMOVED');
    });

    it('defaults unknown status to ACTIVE', () => {
      const summary: CCEWCharitySummary = {
        registeredCharityNumber: 1,
        linkedCharityNumber: 0,
        charityName: 'Test',
        charityType: 'Trust',
        registrationStatus: 'Unknown',
        dateOfRegistration: '2020-01-01',
        dateOfRemoval: null,
      };
      expect(transformSummary(summary).status).toBe('ACTIVE');
    });
  });
});
