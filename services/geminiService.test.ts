import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeInspection } from './geminiService';
import type { MetaData, InspectionReport } from '../types';

// Mock the Google GenAI SDK
vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({
        models: {
            generateContent: vi.fn().mockResolvedValue({
                text: JSON.stringify({
                    inspection_header: {
                        inspection_type: 'incoming',
                        supplier_name: 'Test Supplier',
                        brand: 'Test',
                        product_code: 'TEST-001',
                        po_number: 'PO-001',
                        invoice_number: '',
                        batch_lot_number: '',
                        inspection_date_time: new Date().toISOString(),
                        inspector_name: 'Tester',
                        customer_reference: '',
                        spec_limits: ''
                    },
                    images: [],
                    lot_assessment: {
                        lot_status: 'accept',
                        total_cartons_inspected: 1,
                        total_packets_inspected: 1,
                        total_electrodes_sampled: 1,
                        defect_summary: [],
                        critical_defects_present: false,
                        critical_defect_details: [],
                        conformity_summary: {
                            product_match_spec: true,
                            branding_match_spec: true,
                            batch_and_dates_present: true
                        },
                        trend_comment: 'Test'
                    }
                }) + '\n\nTest summary'
            })
        }
    }))
}));

vi.mock('../utils/env', () => ({
    getEnv: vi.fn((key: string) => key === 'API_KEY' ? 'test-key' : '')
}));

describe('geminiService', () => {
    const mockMeta: MetaData = {
        inspection_type: 'incoming',
        supplier_name: 'Test Supplier',
        brand: 'Test',
        product_code: 'TEST-001',
        po_number: 'PO-001',
        inspector_name: 'Tester',
        spec_limits: ''
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should throw error if API key is missing', async () => {
        const { getEnv } = await import('../utils/env');
        vi.mocked(getEnv).mockReturnValue('');

        await expect(
            analyzeInspection(['data:image/png;base64,test'], mockMeta)
        ).rejects.toThrow('API Key is missing');
    });

    it('should successfully analyze inspection with valid inputs', async () => {
        const result = await analyzeInspection(
            ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='],
            mockMeta
        );

        expect(result).toHaveProperty('report');
        expect(result).toHaveProperty('summary');
        expect(result.report).toHaveProperty('inspection_header');
        expect(result.report.inspection_header.supplier_name).toBe('Test Supplier');
    });

    it('should handle multiple images', async () => {
        const images = [
            'data:image/png;base64,test1',
            'data:image/png;base64,test2'
        ];

        const result = await analyzeInspection(images, mockMeta);
        expect(result).toHaveProperty('report');
    });
});
