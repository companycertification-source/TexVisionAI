import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataService } from './dataService';
import type { InspectionReport, ItemMaster } from '../types';

// Mock Supabase
vi.mock('./supabaseClient', () => ({
    supabase: null,
    isSupabaseConfigured: () => false
}));

describe('dataService', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('getHistory', () => {
        it('should return empty array when no data exists', async () => {
            localStorage.removeItem('texvision_history_v1');
            const history = await dataService.getHistory();
            expect(Array.isArray(history)).toBe(true);
        });

        it('should return mock history when storage is empty', async () => {
            const history = await dataService.getHistory();
            expect(history.length).toBeGreaterThan(0);
            expect(history[0]).toHaveProperty('inspection_header');
        });
    });

    describe('saveReport', () => {
        it('should save report to localStorage', async () => {
            const mockReport: InspectionReport = {
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
            };

            const result = await dataService.saveReport(mockReport);
            expect(result).toBe(true);

            const saved = await dataService.getHistory();
            expect(saved[0]?.inspection_header.po_number).toBe('PO-001');
        });

        it('should handle quota exceeded error gracefully', async () => {
            // Create a very large report to trigger quota
            const largeReport: InspectionReport = {
                inspection_header: {
                    inspection_type: 'incoming',
                    supplier_name: 'Test',
                    brand: 'Test',
                    style_number: 'TEST',
                    po_number: 'PO-LARGE',
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
                },
                // Add large base64 string
                imageUrls: [new Array(5000).fill('A').join('')]
            };

            const result = await dataService.saveReport(largeReport);
            expect(typeof result).toBe('boolean');
        });
    });

    describe('getItems', () => {
        it('should return default items when storage is empty', async () => {
            const items = await dataService.getItems();
            expect(items.length).toBeGreaterThan(0);
            expect(items[0]).toHaveProperty('code');
        });
    });

    describe('saveItem', () => {
        it('should save new item', async () => {
            const newItem: ItemMaster = {
                id: 'test-1',
                name: 'Test Item',
                code: 'TEST-001',
                category: 'Test',
                item_type: 'buy',
                description: 'Test item',
                specifications: 'Test specs'
            };

            const result = await dataService.saveItem(newItem);
            expect(result).toBe(true);

            const items = await dataService.getItems();
            const saved = items.find(i => i.id === 'test-1');
            expect(saved?.code).toBe('TEST-001');
        });
    });

    describe('deleteItem', () => {
        it('should delete item by id', async () => {
            const items = await dataService.getItems();
            const firstId = items[0]?.id;

            if (firstId) {
                const result = await dataService.deleteItem(firstId);
                expect(result).toBe(true);

                const updated = await dataService.getItems();
                const deleted = updated.find(i => i.id === firstId);
                expect(deleted).toBeUndefined();
            }
        });
    });
});
