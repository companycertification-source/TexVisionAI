import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeInspection } from './geminiService';
import type { MetaData } from '../types';

// Define the mock function outside to be accessible
const mockGenerateContent = vi.fn();

// Mock the Google GenAI SDK
vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: vi.fn().mockImplementation(() => {
            return {
                models: {
                    generateContent: mockGenerateContent
                }
            };
        })
    };
});

vi.mock('../utils/env', () => ({
    getApiKey: vi.fn(() => 'test-key')
}));

describe('geminiService', () => {
    const mockMeta: MetaData = {
        inspection_type: 'incoming',
        supplier_name: 'Test Supplier',
        brand: 'Test',
        style_number: 'TEST-001',
        po_number: 'PO-001',
        inspector_name: 'Tester',
        spec_limits: ''
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        const { getApiKey } = await import('../utils/env');
        vi.mocked(getApiKey).mockReturnValue('test-key');

        // Setup default success response
        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify({
                inspection_header: {
                    inspection_type: 'incoming',
                    supplier_name: 'Test Supplier',
                    brand: 'Test',
                    style_number: 'TEST-001',
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
                    total_items_inspected: 10,
                    defect_summary: [],
                    critical_defects_present: false,
                    critical_defect_details: [],
                    conformity_summary: {
                        product_match_spec: true,
                        branding_match_spec: true,
                        labeling_present: true
                    },
                    trend_comment: 'Test'
                }
            }) + '\n\nTest summary'
        });
    });

    it('should throw error if API key is missing', async () => {
        const { getApiKey } = await import('../utils/env');
        vi.mocked(getApiKey).mockReturnValue('');

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
        expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should handle multiple images', async () => {
        const images = [
            'data:image/png;base64,test1',
            'data:image/png;base64,test2'
        ];

        const result = await analyzeInspection(images, mockMeta);
        expect(result).toHaveProperty('report');
        expect(mockGenerateContent).toHaveBeenCalled();
    });
});
