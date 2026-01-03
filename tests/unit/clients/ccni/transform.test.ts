import { describe, it, expect } from 'vitest';
import {
  transformDetails,
  transformSummary,
  transformSearchResponse,
  transformTrustee,
  transformTrustees,
} from '../../../../src/clients/ccni/transform.js';
import type { CCNICharityDetails, CCNICharitySummary, CCNISearchResponse } from '../../../../src/types/raw/ccni.js';
import charityDetailsFixture from '../../../fixtures/ccni/charity-details.json';
import searchResponseFixture from '../../../fixtures/ccni/search-response.json';

describe('CCNI transform functions', () => {
  describe('transformDetails', () => {
    const details = charityDetailsFixture as CCNICharityDetails;

    it('transforms charity identifiers correctly', () => {
      const result = transformDetails(details);

      expect(result.id).toBe('NIC100002');
      expect(result.regulator).toBe('CCNI');
      expect(result.registrationNumber).toBe('100002');
      expect(result.subsidiaryNumber).toBeUndefined();
      expect(result.companyNumber).toBeUndefined(); // '0' should be undefined
    });

    it('transforms core info correctly', () => {
      const result = transformDetails(details);

      expect(result.name).toBe('Cancer Lifeline');
      expect(result.otherNames).toEqual(['Lifeline for Cancer']);
      expect(result.status).toBe('ACTIVE');
      expect(result.registeredDate).toBeInstanceOf(Date);
      expect(result.removedDate).toBeNull();
    });

    it('transforms contact info correctly', () => {
      const result = transformDetails(details);

      expect(result.website).toBe('https://www.cancerlifeline.org');
      expect(result.email).toBe('info@cancerlifeline.org');
      expect(result.phone).toBe('028 1234 5678');
      expect(result.address).toBe('123 Main Street, Belfast, BT1 1AA');
    });

    it('transforms financial info correctly', () => {
      const result = transformDetails(details);

      expect(result.latestIncome).toBe(150000);
      expect(result.latestExpenditure).toBe(120000);
      expect(result.financialYearEnd).toBeInstanceOf(Date);
    });

    it('transforms people counts correctly', () => {
      const result = transformDetails(details);

      expect(result.employeeCount).toBe(5);
      expect(result.volunteerCount).toBe(20);
      expect(result.trusteeCount).toBe(7);
    });

    it('transforms classification correctly', () => {
      const result = transformDetails(details);

      expect(result.purposes).toContain('The advancement of health or the saving of lives');
      expect(result.beneficiaries).toContain('People with a particular illness or condition');
      expect(result.activities).toContain('Provides services');
      expect(result.areasOfOperation).toContain('Northern Ireland');
    });

    it('transforms governance info correctly', () => {
      const result = transformDetails(details);

      expect(result.organisationType).toBe('Charitable company (Ltd by guarantee, no share capital)');
      expect(result.governingDocumentType).toBe('Memorandum and Articles of Association');
    });

    it('transforms extended text correctly', () => {
      const result = transformDetails(details);

      expect(result.charitableObjects).toContain('support and services');
      expect(result.publicBenefit).toContain('free of charge');
      expect(result.activityDescription).toContain('counselling');
    });

    it('includes raw data', () => {
      const result = transformDetails(details);

      expect(result._raw).toBe(details);
    });
  });

  describe('transformSummary', () => {
    const summary: CCNICharitySummary = {
      regNo: '100002',
      subNo: '0',
      name: 'Cancer Lifeline',
      orgType: 'Up-to-date',
      url: '/charity-details/?regId=100002&subId=0',
      statusLabel: 'Up-to-date',
      statusCssStyle: 'success',
      hideStatus: false,
    };

    it('transforms identifiers correctly', () => {
      const result = transformSummary(summary);

      expect(result.id).toBe('NIC100002');
      expect(result.regulator).toBe('CCNI');
      expect(result.registrationNumber).toBe('100002');
    });

    it('transforms basic info correctly', () => {
      const result = transformSummary(summary);

      expect(result.name).toBe('Cancer Lifeline');
      expect(result.status).toBe('ACTIVE');
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
    const searchResponse = searchResponseFixture as CCNISearchResponse;

    it('transforms pagination correctly', () => {
      const result = transformSearchResponse(searchResponse);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(15);
      expect(result.totalPages).toBe(2);
      expect(result.total).toBe(25);
    });

    it('transforms items correctly', () => {
      const result = transformSearchResponse(searchResponse);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('NIC100002');
      expect(result.items[0].name).toBe('Cancer Lifeline');
    });

    it('transforms aggregations correctly', () => {
      const result = transformSearchResponse(searchResponse);

      expect(result.aggregations).toBeDefined();
      expect(result.aggregations?.income).toBeDefined();
      expect(result.aggregations?.income).toHaveLength(3);
      expect(result.aggregations?.income[0]).toEqual({
        value: 'Under £10K',
        label: 'Under £10K',
        count: 5,
      });
    });

    it('includes status aggregation from onlyShow', () => {
      const result = transformSearchResponse(searchResponse);

      expect(result.aggregations?.status).toBeDefined();
      expect(result.aggregations?.status).toHaveLength(2);
    });
  });

  describe('transformTrustee', () => {
    it('transforms trustee correctly', () => {
      const trustee = {
        id: 1,
        name: 'John Smith',
        isChair: true,
        charityNumbersOfOtherTrusteeships: [100003, 100004],
      };

      const result = transformTrustee(trustee);

      expect(result.name).toBe('John Smith');
      expect(result.isChair).toBe(true);
      expect(result.otherTrusteeships).toEqual(['NIC100003', 'NIC100004']);
    });

    it('handles trustee with no other trusteeships', () => {
      const trustee = {
        id: 2,
        name: 'Jane Doe',
        isChair: false,
        charityNumbersOfOtherTrusteeships: [],
      };

      const result = transformTrustee(trustee);

      expect(result.name).toBe('Jane Doe');
      expect(result.isChair).toBe(false);
      expect(result.otherTrusteeships).toEqual([]);
    });
  });

  describe('transformTrustees', () => {
    it('transforms array of trustees', () => {
      const trustees = [
        { id: 1, name: 'John Smith', isChair: true, charityNumbersOfOtherTrusteeships: [] },
        { id: 2, name: 'Jane Doe', isChair: false, charityNumbersOfOtherTrusteeships: [] },
      ];

      const result = transformTrustees(trustees);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Smith');
      expect(result[1].name).toBe('Jane Doe');
    });
  });

  describe('status mapping', () => {
    it('maps Up-to-date to ACTIVE', () => {
      const summary: CCNICharitySummary = {
        regNo: '1', subNo: '0', name: 'Test', orgType: 'Up-to-date',
        url: '', statusLabel: '', statusCssStyle: '', hideStatus: false,
      };
      expect(transformSummary(summary).status).toBe('ACTIVE');
    });

    it('maps In default to IN_DEFAULT', () => {
      const summary: CCNICharitySummary = {
        regNo: '1', subNo: '0', name: 'Test', orgType: 'In default',
        url: '', statusLabel: '', statusCssStyle: '', hideStatus: false,
      };
      expect(transformSummary(summary).status).toBe('IN_DEFAULT');
    });

    it('maps Removed to REMOVED', () => {
      const summary: CCNICharitySummary = {
        regNo: '1', subNo: '0', name: 'Test', orgType: 'Removed',
        url: '', statusLabel: '', statusCssStyle: '', hideStatus: false,
      };
      expect(transformSummary(summary).status).toBe('REMOVED');
    });

    it('maps Due documents received late to LATE', () => {
      const summary: CCNICharitySummary = {
        regNo: '1', subNo: '0', name: 'Test', orgType: 'Due documents received late',
        url: '', statusLabel: '', statusCssStyle: '', hideStatus: false,
      };
      expect(transformSummary(summary).status).toBe('LATE');
    });

    it('maps Recently registered to RECENTLY_REGISTERED', () => {
      const summary: CCNICharitySummary = {
        regNo: '1', subNo: '0', name: 'Test', orgType: 'Recently registered',
        url: '', statusLabel: '', statusCssStyle: '', hideStatus: false,
      };
      expect(transformSummary(summary).status).toBe('RECENTLY_REGISTERED');
    });

    it('defaults unknown status to ACTIVE', () => {
      const summary: CCNICharitySummary = {
        regNo: '1', subNo: '0', name: 'Test', orgType: 'Unknown Status',
        url: '', statusLabel: '', statusCssStyle: '', hideStatus: false,
      };
      expect(transformSummary(summary).status).toBe('ACTIVE');
    });
  });
});
