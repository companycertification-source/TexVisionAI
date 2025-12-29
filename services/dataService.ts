import { InspectionReport, ItemMaster, ImageResult } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEY = 'texvision_history_v1';
const ITEMS_KEY = 'texvision_items_v1';

const DEFAULT_ITEMS: ItemMaster[] = [
  {
    id: '1',
    name: '100% Cotton Poplin - White',
    code: 'FAB-COT-001',
    category: 'Fabric',
    item_type: 'sell',
    uom: 'roll',
    description: 'High quality combed cotton poplin. 120GSM.',
    specifications: 'Color must be bright white. No weaving defects allowed. Hand feel soft.',
    quality_checkpoints: [
      "Check for oil stains",
      "Verify weaving consistency",
      "Inspect for holes or tears",
      "Color shade continuity"
    ],
    reference_image_url: 'https://images.unsplash.com/photo-1596482322308-14407bfe7c0e?auto=format&fit=crop&q=80&w=300',
    aql_config: {
      level: 'II',
      major: 2.5,
      minor: 4.0
    }
  },
  {
    id: '2',
    name: 'Men\'s Denim Jeans - Classic Fit',
    code: 'WASH-DEN-005',
    category: 'Finished Garment',
    item_type: 'sell',
    uom: 'pcs',
    description: 'Classic fit denim jeans, stone wash.',
    specifications: 'Consistent wash shade. No missed stitches. Buttons secure.',
    quality_checkpoints: [
      "Check seam strength",
      "Verify wash consistency",
      "Inspect zipper and buttons",
      "Label placement check"
    ],
    reference_image_url: 'https://images.unsplash.com/photo-1542272617-08f08637533d?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: '3',
    name: 'Silk Thread Spools',
    code: 'RM-THR-SILK',
    category: 'Raw Material',
    item_type: 'buy',
    preferred_supplier: 'TexStyle Inc',
    uom: 'box',
    description: 'Pack of 12 silk thread spools.',
    specifications: 'Color fastness check required. No fraying.',
    quality_checkpoints: [
      "Check color code match",
      "Verify box condition",
      "Inspect thread integrity"
    ],
    reference_image_url: ''
  }
];

const DEFAULT_SUPPLIERS = [
  "FabriCo Ltd",
  "TexStyle Inc",
  "Global Garments Co.",
  "Premium Weavers",
  "ThreadMaster Corp.",
  "Luxe Fabrics International",
  "EcoTextile Solutions",
  "FastFashion Supply"
];

// Helper to create valid mock image results for the dashboard drill-down
const createMockImage = (defectCount: number, defectType: string = 'stain'): ImageResult => ({
  image_id: Math.random().toString(36).substr(2, 9),
  status: defectCount > 0 ? (defectCount > 3 ? 'rejected' : 'accepted_with_minor_defects') : 'accepted',
  ocr_results: {
    confidence: 0.98, brand: 'FabriCo', style_number: 'FAB-COT-001', size_label: '',
    batch_lot_number: 'MOCK-LOT-001', mfg_date: '2024-01-01', material_composition: '100% Cotton', care_instructions: [], other_text: []
  },
  objects: [],
  items: [],
  defects: defectCount > 0 ? [{
    class: defectType,
    severity: defectCount > 3 ? 'major' : 'minor',
    description: `Mock ${defectType.replace(/_/g, ' ')} detected for demonstration.`,
    count: defectCount,
    locations: [[0.1, 0.1, 0.2, 0.2]]
  }] : [],
  counts: { visible_cartons: 1, visible_items: 1 },
  overlays: []
});

const generateMockHistory = (): InspectionReport[] => {
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

  return [
    // 1. FabriCo - Recent Remarks
    {
      inspection_header: {
        inspection_type: 'incoming',
        supplier_name: 'FabriCo Ltd',
        brand: 'FabriCo',
        style_number: 'FAB-COT-001',
        po_number: 'PO-24-105',
        invoice_number: 'INV-882',
        batch_lot_number: 'FB-2024-009',
        inspection_date_time: daysAgo(2),
        inspector_name: 'Demo Inspector',
        customer_reference: 'REF-001',
        spec_limits: ''
      },
      images: [createMockImage(2, 'stain')],
      imageUrls: ['https://images.unsplash.com/photo-1596482322308-14407bfe7c0e?auto=format&fit=crop&q=80&w=300'],
      lot_assessment: {
        lot_status: 'accept_with_remarks',
        total_items_inspected: 50,
        defect_summary: [{ class: 'stain', count: 2, percentage: 4, description: 'Small stains observed on outer layer.' }],
        critical_defects_present: false,
        critical_defect_details: [],
        conformity_summary: { product_match_spec: true, branding_match_spec: true, labeling_present: true },
        trend_comment: 'Slight increase in stain defects.'
      },
      performance_insights: {
        supplier_performance: {
          supplier_name: 'FabriCo Ltd',
          lots_inspected_total: 12,
          lots_rejected_total: 0,
          lots_accepted_with_remarks_total: 3,
          current_lot_defect_rate_percent: 4.0,
          historical_average_defect_rate_percent: 2.1,
          current_vs_history_comment: 'Higher than average'
        },
        inspector_performance: {
          inspector_name: 'Demo Inspector',
          inspections_done_total: 15,
          lots_rejected_total: 1,
          average_lot_defect_rate_percent: 1.5,
          current_lot_defect_rate_percent: 4.0,
          consistency_comment: 'Consistent'
        }
      }
    },

    // 2. TexStyle - Perfect (Recent)
    {
      inspection_header: {
        inspection_type: 'finished_goods',
        supplier_name: 'TexStyle Inc',
        brand: 'TexStyle',
        style_number: 'WASH-DEN-005',
        po_number: 'PO-24-098',
        invoice_number: 'TX-992',
        batch_lot_number: 'TX-23-B2',
        inspection_date_time: daysAgo(5),
        inspector_name: 'Demo Inspector',
        customer_reference: '',
        spec_limits: ''
      },
      images: [createMockImage(0)],
      imageUrls: ['https://images.unsplash.com/photo-1542272617-08f08637533d?auto=format&fit=crop&q=80&w=300'],
      lot_assessment: {
        lot_status: 'accept',
        total_items_inspected: 20,
        defect_summary: [],
        critical_defects_present: false,
        critical_defect_details: [],
        conformity_summary: { product_match_spec: true, branding_match_spec: true, labeling_present: true },
        trend_comment: 'Excellent quality maintained.'
      },
      performance_insights: {
        supplier_performance: {
          supplier_name: 'TexStyle Inc',
          lots_inspected_total: 25,
          lots_rejected_total: 0,
          lots_accepted_with_remarks_total: 0,
          current_lot_defect_rate_percent: 0.0,
          historical_average_defect_rate_percent: 0.1,
          current_vs_history_comment: 'Consistent excellence'
        },
        inspector_performance: {
          inspector_name: 'Demo Inspector',
          inspections_done_total: 15,
          lots_rejected_total: 1,
          average_lot_defect_rate_percent: 1.5,
          current_lot_defect_rate_percent: 0.0,
          consistency_comment: 'Consistent'
        }
      }
    },

    // 3. Global Garments - Rejected (Mid-term)
    {
      inspection_header: {
        inspection_type: 'incoming',
        supplier_name: 'Global Garments Co.',
        brand: 'Global',
        style_number: 'SHIRT-CHK-002',
        po_number: 'PO-24-080',
        invoice_number: 'GG-112',
        batch_lot_number: 'GG-23-X1',
        inspection_date_time: daysAgo(12),
        inspector_name: 'Demo Inspector',
        customer_reference: '',
        spec_limits: ''
      },
      images: [createMockImage(15, 'hole')],
      imageUrls: ['https://images.unsplash.com/photo-1596482322308-14407bfe7c0e?auto=format&fit=crop&q=80&w=300'],
      lot_assessment: {
        lot_status: 'reject',
        total_items_inspected: 100,
        defect_summary: [{ class: 'hole', count: 15, percentage: 15, description: 'Fabric holes detected in 15% of samples.' }],
        critical_defects_present: true,
        critical_defect_details: ['Fabric integrity compromised'],
        conformity_summary: { product_match_spec: true, branding_match_spec: true, labeling_present: true },
        trend_comment: 'Recurring fabric issues.'
      },
      performance_insights: {
        supplier_performance: {
          supplier_name: 'Global Garments Co.',
          lots_inspected_total: 8,
          lots_rejected_total: 2,
          lots_accepted_with_remarks_total: 1,
          current_lot_defect_rate_percent: 15.0,
          historical_average_defect_rate_percent: 4.5,
          current_vs_history_comment: 'Significantly worse'
        },
        inspector_performance: {
          inspector_name: 'Demo Inspector',
          inspections_done_total: 15,
          lots_rejected_total: 1,
          average_lot_defect_rate_percent: 1.5,
          current_lot_defect_rate_percent: 15.0,
          consistency_comment: 'Consistent'
        }
      }
    }
  ];
};

/**
 * Data Service
 * 
 * Abstracts the backend storage logic.
 * - If Supabase credentials are in env, it uses Supabase (Table: 'inspections', 'items').
 * - Otherwise, it falls back to localStorage.
 */

export const dataService = {

  async getHistory(): Promise<InspectionReport[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('inspections')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform DB structure back to app types if necessary
        return data.map((row: any) => row.report_data as InspectionReport);
      } catch (err) {
        console.error("Supabase fetch error:", err);
        return [];
      }
    } else {
      // LocalStorage Fallback
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }

        // If storage is empty, return the mock history to populate the dashboard
        const mockData = generateMockHistory();
        // Optionally save it so it persists for this session
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockData));
        return mockData;

      } catch (e) {
        console.warn("Failed to load local history", e);
        return [];
      }
    }
  },

  async saveReport(report: InspectionReport): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('inspections')
          .insert([
            {
              supplier_name: report.inspection_header.supplier_name,
              po_number: report.inspection_header.po_number,
              inspector_name: report.inspection_header.inspector_name,
              created_at: report.inspection_header.inspection_date_time,
              report_data: report
            }
          ]);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Supabase save error:", err);
        return false;
      }
    } else {
      // LocalStorage Fallback
      try {
        const current = await this.getHistory();
        let updated = [report, ...current];

        // Initial limit
        let limit = 50;

        const saveWithLimit = (data: InspectionReport[], limit: number): boolean => {
          try {
            const trimmed = data.slice(0, limit);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
            return true;
          } catch (e: any) {
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
              if (limit <= 5) {
                console.error("Storage full even with minimal history. Clearing old data.");
                // Last resort: Keep only the new one
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify([report]));
                  return true;
                } catch (finalErr) {
                  return false;
                }
              }
              console.warn(`Storage quota exceeded at limit ${limit}. Retrying with limit ${Math.floor(limit / 2)}...`);
              return saveWithLimit(data, Math.floor(limit / 2));
            }
            return false;
          }
        };

        return saveWithLimit(updated, limit);

      } catch (e) {
        console.error("Storage quota exceeded or save failed", e);
        return false;
      }
    }
  },

  async updateReport(updatedReport: InspectionReport): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('inspections')
          .update({ report_data: updatedReport })
          .eq('created_at', updatedReport.inspection_header.inspection_date_time);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Supabase update error", err);
        return false;
      }
    } else {
      try {
        const current = await this.getHistory();
        const updated = current.map(r =>
          r.inspection_header.inspection_date_time === updatedReport.inspection_header.inspection_date_time
            ? updatedReport
            : r
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return true;
      } catch {
        return false;
      }
    }
  },

  // --- Item Master Methods ---

  async getItems(): Promise<ItemMaster[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('name');

        if (error) throw error;
        return data as ItemMaster[];
      } catch (err) {
        console.error("Supabase items fetch error:", err);
        return DEFAULT_ITEMS;
      }
    } else {
      try {
        const stored = localStorage.getItem(ITEMS_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
        return DEFAULT_ITEMS;
      } catch {
        return DEFAULT_ITEMS;
      }
    }
  },

  async saveItem(item: ItemMaster): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('items')
          .upsert(item);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Supabase item save error:", err);
        return false;
      }
    } else {
      try {
        const current = await this.getItems();
        // Check if update or new
        const index = current.findIndex(i => i.id === item.id);
        let updatedItems = [];
        if (index >= 0) {
          updatedItems = [...current];
          updatedItems[index] = item;
        } else {
          updatedItems = [...current, item];
        }

        localStorage.setItem(ITEMS_KEY, JSON.stringify(updatedItems));
        return true;
      } catch (e) {
        console.error("Failed to save item", e);
        return false;
      }
    }
  },

  async deleteItem(itemId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('items')
          .delete()
          .eq('id', itemId);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Supabase item delete error:", err);
        return false;
      }
    } else {
      try {
        const current = await this.getItems();
        const updatedItems = current.filter(i => i.id !== itemId);
        localStorage.setItem(ITEMS_KEY, JSON.stringify(updatedItems));
        return true;
      } catch (e) {
        console.error("Failed to delete item", e);
        return false;
      }
    }
  },

  // --- Supplier Methods ---

  async getSuppliers(): Promise<string[]> {
    return DEFAULT_SUPPLIERS;
  }
};