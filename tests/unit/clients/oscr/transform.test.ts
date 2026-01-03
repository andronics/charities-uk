import { describe, it, expect } from 'vitest';
import {
  transformCharity,
  transformAllCharitiesResponse,
  transformAnnualReturn,
  transformAnnualReturns,
  enrichCharityWithAnnualReturn,
} from '../../../../src/clients/oscr/transform.js';
import type { OSCRCharity, OSCRAllCharitiesResponse, OSCRAnnualReturn } from '../../../../src/types/raw/oscr.js';
import charityFixture from '../../../fixtures/oscr/charity.json';
import allCharitiesFixture from '../../../fixtures/oscr/all-charities-response.json';
import annualReturnsFixture from '../../../fixtures/oscr/annual-returns.json';

describe('OSCR transform functions', () => {
  describe('transformCharity', () => {
    const charity = charityFixture as OSCRCharity;

    it('transforms charity identifiers correctly', () => {
      const result = transformCharity(charity);

      expect(result.id).toBe('SC000001');
      expect(result.regulator).toBe('OSCR');
      expect(result.registrationNumber).toBe('SC000001');
      expect(result.subsidiaryNumber).toBeUndefined();
    });

    it('transforms core info correctly', () => {
      const result = transformCharity(charity);

      expect(result.name).toBe('Stoneyburn Community Education Centre');
      expect(result.otherNames).toEqual(['Stoneyburn CEC']);
      expect(result.status).toBe('ACTIVE');
      expect(result.registeredDate).toBeInstanceOf(Date);
    });

    it('transforms contact info correctly', () => {
      const result = transformCharity(charity);

      expect(result.website).toBe('https://www.stoneyburncentre.org.uk');
      expect(result.email).toBeNull(); // Not provided by OSCR
      expect(result.phone).toBeNull(); // Not provided by OSCR
      expect(result.address).toBe('Main Street, Stoneyburn, West Lothian, EH47 8BN');
    });

    it('transforms financial info correctly', () => {
      const result = transformCharity(charity);

      expect(result.latestIncome).toBe(85000);
      expect(result.latestExpenditure).toBe(78000);
      expect(result.financialYearEnd).toBeInstanceOf(Date);
    });

    it('transforms classification correctly', () => {
      const result = transformCharity(charity);

      expect(result.purposes).toContain('The advancement of education');
      expect(result.beneficiaries).toContain('Children/young people');
      expect(result.activities).toContain('Provides services');
      expect(result.areasOfOperation).toContain('West Lothian');
    });

    it('transforms governance info correctly', () => {
      const result = transformCharity(charity);

      expect(result.organisationType).toBe('SCIO (Scottish Charitable Incorporated Organisation)');
    });

    it('transforms extended text correctly', () => {
      const result = transformCharity(charity);

      expect(result.charitableObjects).toContain('educational and recreational facilities');
      expect(result.activityDescription).toContain('Community education centre');
    });

    it('includes raw data', () => {
      const result = transformCharity(charity);

      expect(result._raw).toBe(charity);
    });

    it('handles charity without knownAs', () => {
      const charityWithoutKnownAs = { ...charity, knownAs: null };
      const result = transformCharity(charityWithoutKnownAs);

      expect(result.otherNames).toEqual([]);
    });
  });

  describe('transformAllCharitiesResponse', () => {
    const response = allCharitiesFixture as OSCRAllCharitiesResponse;

    it('transforms pagination correctly', () => {
      const result = transformAllCharitiesResponse(response);

      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(250);
      expect(result.pageSize).toBe(2); // Based on data length
    });

    it('transforms items correctly', () => {
      const result = transformAllCharitiesResponse(response);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('SC000001');
      expect(result.items[1].id).toBe('SC000002');
    });

    it('has no aggregations', () => {
      const result = transformAllCharitiesResponse(response);

      expect(result.aggregations).toBeUndefined();
    });
  });

  describe('transformAnnualReturn', () => {
    const annualReturn = annualReturnsFixture[0] as OSCRAnnualReturn;

    it('transforms to FinancialYear correctly', () => {
      const result = transformAnnualReturn(annualReturn);

      expect(result.yearEnd).toBeInstanceOf(Date);
      expect(result.income).toBe(85000);
      expect(result.expenditure).toBe(78000);
    });
  });

  describe('transformAnnualReturns', () => {
    const returns = annualReturnsFixture as OSCRAnnualReturn[];

    it('transforms array of annual returns', () => {
      const result = transformAnnualReturns(returns);

      expect(result).toHaveLength(2);
      expect(result[0].income).toBe(85000);
      expect(result[1].income).toBe(75000);
    });
  });

  describe('enrichCharityWithAnnualReturn', () => {
    const charity = transformCharity(charityFixture as OSCRCharity);
    const annualReturn = annualReturnsFixture[0] as OSCRAnnualReturn;

    it('enriches charity with employee and trustee counts', () => {
      const result = enrichCharityWithAnnualReturn(charity, annualReturn);

      expect(result.employeeCount).toBe(3);
      expect(result.trusteeCount).toBe(8);
    });

    it('updates financial information', () => {
      const result = enrichCharityWithAnnualReturn(charity, annualReturn);

      expect(result.latestIncome).toBe(85000);
      expect(result.latestExpenditure).toBe(78000);
    });

    it('preserves other charity data', () => {
      const result = enrichCharityWithAnnualReturn(charity, annualReturn);

      expect(result.name).toBe('Stoneyburn Community Education Centre');
      expect(result.regulator).toBe('OSCR');
      expect(result.purposes).toContain('The advancement of education');
    });
  });

  describe('status mapping', () => {
    it('maps Active to ACTIVE', () => {
      const charity: OSCRCharity = {
        ...charityFixture as OSCRCharity,
        charityStatus: 'Active',
      };
      expect(transformCharity(charity).status).toBe('ACTIVE');
    });

    it('maps Removed to REMOVED', () => {
      const charity: OSCRCharity = {
        ...charityFixture as OSCRCharity,
        charityStatus: 'Removed',
      };
      expect(transformCharity(charity).status).toBe('REMOVED');
    });

    it('defaults unknown status to ACTIVE', () => {
      const charity: OSCRCharity = {
        ...charityFixture as OSCRCharity,
        charityStatus: 'Unknown',
      };
      expect(transformCharity(charity).status).toBe('ACTIVE');
    });
  });
});
