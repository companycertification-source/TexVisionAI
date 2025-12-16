import { InspectionReport, ItemMaster, ImageResult } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEY = 'weldvision_history_v1';
const ITEMS_KEY = 'weldvision_items_v1';

const DEFAULT_ITEMS: ItemMaster[] = [
  {
    id: '1',
    name: 'E6013 Mild Steel Electrode',
    code: 'E6013-3.2',
    category: 'Electrodes',
    item_type: 'sell',
    uom: 'kg',
    description: 'General purpose mild steel welding electrode. 3.2mm x 350mm.',
    specifications: 'Grey coating. Smooth surface. Concentricity < 3%. Tip must be clean (2mm exposed). Branding "E6013" must be visible on grip end.',
    quality_checkpoints: [
      "Check for coating concentricity",
      "Verify tip exposure is approx 2mm",
      "Ensure branding print is legible",
      "Inspect for transverse cracks in coating"
    ],
    reference_image_url: 'https://images.unsplash.com/photo-1563289069-42b4d45d3412?auto=format&fit=crop&q=80&w=300',
    aql_config: {
      level: 'III',
      major: 1.5,
      minor: 2.5
    }
  },
  {
    id: '2',
    name: 'E7018 Low Hydrogen',
    code: 'E7018-4.0',
    category: 'Electrodes',
    item_type: 'sell',
    uom: 'pcs',
    description: 'Basic coated low hydrogen electrode for high tensile steel. 4.0mm.',
    specifications: 'White/Grey coating. Moisture resistant pack. No coating chips allowed. Flux must be intact.',
    quality_checkpoints: [
      "Check for moisture damage on pack",
      "Inspect grip end for rust",
      "Verify flux coating is intact (no chips)",
      "Check batch number legibility"
    ],
    reference_image_url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: '3',
    name: 'Welding Wire ER70S-6',
    code: 'ER70S-6',
    category: 'Wire',
    item_type: 'sell',
    uom: 'roll',
    description: 'Copper coated mild steel MIG wire.',
    specifications: 'Uniform copper coating. No rust allowed. Layer wound on spool.',
    quality_checkpoints: [
      "Check copper coating uniformity",
      "Verify spool winding is level",
      "Inspect for any surface rust"
    ],
    reference_image_url: ''
  },
  {
    id: '4',
    name: 'Flux Powder (Raw Material)',
    code: 'RM-FLX-001',
    category: 'Raw Material',
    item_type: 'buy',
    preferred_supplier: 'Shanghai Industries (Pvt) Ltd.',
    uom: 'kg',
    description: 'High grade rutile based flux powder for E6013 production.',
    specifications: 'Moisture content < 0.5%. Particle size distribution mesh 60-100.',
    quality_checkpoints: [
      "Verify moisture content certificate",
      "Check bag integrity",
      "Confirm particle mesh size visual check"
    ],
    reference_image_url: ''
  }
];

const DEFAULT_SUPPLIERS = [
  "Shanghai Industries (Pvt) Ltd.",
  "Beijing Welding Consumables Co.",
  "Nippon Steel Welding",
  "Esab India Ltd.",
  "Lincoln Electric",
  "Ador Welding Ltd.",
  "Kobelco Welding",
  "Hyundai Welding Co.",
  "Golden Bridge Welding Materials",
  "Tianjin Bridge Welding Materials",
  "Atlantic China Welding Consumables",
  "Kiswel Ltd.",
  "Chosun Welding",
  "Gedik Welding",
  "Oerlikon Welding",
  "Voestalpine Bohler Welding",
  "Miller Electric",
  "Hobart Brothers",
  "Panasonic Welding Systems"
];

// Helper to create valid mock image results for the dashboard drill-down
const createMockImage = (defectCount: number, defectType: string = 'minor_dent'): ImageResult => ({
  image_id: Math.random().toString(36).substr(2, 9),
  status: defectCount > 0 ? (defectCount > 3 ? 'rejected' : 'accepted_with_minor_defects') : 'accepted',
  ocr_results: {
    confidence: 0.98, brand: 'MockBrand', grade: 'E6013', size: '3.2mm',
    batch_lot_number: 'MOCK-001', mfg_date: '2023-01-01', exp_date: '2025-01-01', other_text: []
  },
  objects: [],
  electrodes: [],
  defects: defectCount > 0 ? [{
    class: defectType,
    severity: defectCount > 3 ? 'major' : 'minor',
    description: `Mock ${defectType.replace(/_/g, ' ')} detected for demonstration.`,
    count: defectCount,
    locations: [[0.1, 0.1, 0.2, 0.2]]
  }] : [],
  counts: { visible_cartons: 1, visible_packets: 5, visible_electrodes: 0 },
  overlays: []
});

const generateMockHistory = (): InspectionReport[] => {
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

  return [
    // 1. Shanghai Industries - Recent Remarks
    {
      inspection_header: {
        inspection_type: 'incoming',
        supplier_name: 'Shanghai Industries (Pvt) Ltd.',
        brand: 'Shanghai Industries',
        product_code: 'RM-FLX-001',
        po_number: 'PO-24-105',
        invoice_number: 'INV-882',
        batch_lot_number: 'SH-2023-009',
        inspection_date_time: daysAgo(2),
        inspector_name: 'Demo Inspector',
        customer_reference: 'REF-001',
        spec_limits: ''
      },
      images: [createMockImage(2, 'packaging_tear')],
      imageUrls: ['https://images.unsplash.com/photo-1530982011887-3cc11cc85693?auto=format&fit=crop&q=80&w=300'],
      lot_assessment: {
        lot_status: 'accept_with_remarks',
        total_cartons_inspected: 20,
        total_packets_inspected: 100,
        total_electrodes_sampled: 50,
        defect_summary: [{ class: 'packaging_tear', count: 2, percentage: 4, description: 'Tears observed on outer packaging corners.' }],
        critical_defects_present: false,
        critical_defect_details: [],
        conformity_summary: { product_match_spec: true, branding_match_spec: true, batch_and_dates_present: true },
        trend_comment: 'Slight increase in packaging defects.'
      },
      performance_insights: {
        supplier_performance: {
          supplier_name: 'Shanghai Industries (Pvt) Ltd.',
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

    // 2. Lincoln Electric - Perfect (Recent)
    {
      inspection_header: {
        inspection_type: 'finished_goods',
        supplier_name: 'Lincoln Electric',
        brand: 'Lincoln',
        product_code: 'E7018-4.0',
        po_number: 'PO-24-098',
        invoice_number: 'LE-992',
        batch_lot_number: 'LE-23-B2',
        inspection_date_time: daysAgo(5),
        inspector_name: 'Demo Inspector',
        customer_reference: '',
        spec_limits: ''
      },
      images: [createMockImage(0)],
      imageUrls: ['https://images.unsplash.com/photo-1617791160505-6f00504e3519?auto=format&fit=crop&q=80&w=300'],
      lot_assessment: {
        lot_status: 'accept',
        total_cartons_inspected: 50,
        total_packets_inspected: 200,
        total_electrodes_sampled: 20,
        defect_summary: [],
        critical_defects_present: false,
        critical_defect_details: [],
        conformity_summary: { product_match_spec: true, branding_match_spec: true, batch_and_dates_present: true },
        trend_comment: 'Excellent quality maintained.'
      },
      performance_insights: {
        supplier_performance: {
          supplier_name: 'Lincoln Electric',
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

    // 3. Beijing Welding - Rejected (Mid-term)
    {
      inspection_header: {
        inspection_type: 'incoming',
        supplier_name: 'Beijing Welding Consumables Co.',
        brand: 'Bridge',
        product_code: 'E6013-2.5',
        po_number: 'PO-24-080',
        invoice_number: 'BJ-112',
        batch_lot_number: 'BJ-23-X1',
        inspection_date_time: daysAgo(12),
        inspector_name: 'Demo Inspector',
        customer_reference: '',
        spec_limits: ''
      },
      images: [createMockImage(15, 'moisture_damage')],
      imageUrls: ['https://images.unsplash.com/photo-1563289069-42b4d45d3412?auto=format&fit=crop&q=80&w=300'],
      lot_assessment: {
        lot_status: 'reject',
        total_cartons_inspected: 100,
        total_packets_inspected: 500,
        total_electrodes_sampled: 100,
        defect_summary: [{ class: 'moisture_damage', count: 15, percentage: 15, description: 'Severe moisture damage affecting 15% of cartons.' }],
        critical_defects_present: true,
        critical_defect_details: ['High moisture content detected'],
        conformity_summary: { product_match_spec: true, branding_match_spec: true, batch_and_dates_present: true },
        trend_comment: 'Recurring moisture issues.'
      },
      performance_insights: {
        supplier_performance: {
          supplier_name: 'Beijing Welding Consumables Co.',
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
    },

    // 4. Shanghai Industries - Good (Older)
    {
      inspection_header: {
        inspection_type: 'incoming',
        supplier_name: 'Shanghai Industries (Pvt) Ltd.',
        brand: 'Shanghai Industries',
        product_code: 'RM-FLX-001',
        po_number: 'PO-24-055',
        invoice_number: 'INV-771',
        batch_lot_number: 'SH-2023-005',
        inspection_date_time: daysAgo(20),
        inspector_name: 'Demo Inspector',
        customer_reference: '',
        spec_limits: ''
      },
      images: [createMockImage(0)],
      imageUrls: ['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=300'],
      lot_assessment: {
        lot_status: 'accept',
        total_cartons_inspected: 20,
        total_packets_inspected: 100,
        total_electrodes_sampled: 50,
        defect_summary: [],
        critical_defects_present: false,
        critical_defect_details: [],
        conformity_summary: { product_match_spec: true, branding_match_spec: true, batch_and_dates_present: true },
        trend_comment: 'Consistent quality.'
      },
      performance_insights: {
        supplier_performance: {
          supplier_name: 'Shanghai Industries (Pvt) Ltd.',
          lots_inspected_total: 10,
          lots_rejected_total: 0,
          lots_accepted_with_remarks_total: 2,
          current_lot_defect_rate_percent: 0.0,
          historical_average_defect_rate_percent: 2.0,
          current_vs_history_comment: 'Improvement'
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

    // 5. Lincoln Electric - Good (Older)
    {
      inspection_header: {
        inspection_type: 'finished_goods',
        supplier_name: 'Lincoln Electric',
        brand: 'Lincoln',
        product_code: 'E7018-4.0',
        po_number: 'PO-24-040',
        invoice_number: 'LE-881',
        batch_lot_number: 'LE-23-A1',
        inspection_date_time: daysAgo(25),
        inspector_name: 'Demo Inspector',
        customer_reference: '',
        spec_limits: ''
      },
      images: [createMockImage(0)],
      imageUrls: ['https://images.unsplash.com/photo-1617791160505-6f00504e3519?auto=format&fit=crop&q=80&w=300'],
      lot_assessment: {
        lot_status: 'accept',
        total_cartons_inspected: 50,
        total_packets_inspected: 200,
        total_electrodes_sampled: 20,
        defect_summary: [],
        critical_defects_present: false,
        critical_defect_details: [],
        conformity_summary: { product_match_spec: true, branding_match_spec: true, batch_and_dates_present: true },
        trend_comment: 'Consistent excellence'
      },
      performance_insights: {
        supplier_performance: {
          supplier_name: 'Lincoln Electric',
          lots_inspected_total: 24,
          lots_rejected_total: 0,
          lots_accepted_with_remarks_total: 0,
          current_lot_defect_rate_percent: 0.0,
          historical_average_defect_rate_percent: 0.1,
          current_vs_history_comment: 'Consistent excellence'
        },
        inspector_performance: {
          inspector_name: 'Demo Inspector',
          inspections_done_total: 14,
          lots_rejected_total: 1,
          average_lot_defect_rate_percent: 1.5,
          current_lot_defect_rate_percent: 0.0,
          consistency_comment: 'Consistent'
        }
      }
    },

    // 6. Esab India - Remarks (Older)
    {
      inspection_header: {
        inspection_type: 'incoming',
        supplier_name: 'Esab India Ltd.',
        brand: 'ESAB',
        product_code: 'OK-46.00',
        po_number: 'PO-24-030',
        invoice_number: 'ES-202',
        batch_lot_number: 'ES-23-C9',
        inspection_date_time: daysAgo(35),
        inspector_name: 'Demo Inspector',
        customer_reference: '',
        spec_limits: ''
      },
      images: [createMockImage(3, 'coating_chip')],
      imageUrls: ['https://images.unsplash.com/photo-1563289069-42b4d45d3412?auto=format&fit=crop&q=80&w=300'],
      lot_assessment: {
        lot_status: 'accept_with_remarks',
        total_cartons_inspected: 30,
        total_packets_inspected: 150,
        total_electrodes_sampled: 60,
        defect_summary: [{ class: 'coating_chip', count: 3, percentage: 5, description: 'Minor coating chips observed near the tip.' }],
        critical_defects_present: false,
        critical_defect_details: [],
        conformity_summary: { product_match_spec: true, branding_match_spec: true, batch_and_dates_present: true },
        trend_comment: 'Coating fragility noted.'
      },
      performance_insights: {
        supplier_performance: {
          supplier_name: 'Esab India Ltd.',
          lots_inspected_total: 10,
          lots_rejected_total: 0,
          lots_accepted_with_remarks_total: 4,
          current_lot_defect_rate_percent: 5.0,
          historical_average_defect_rate_percent: 3.5,
          current_vs_history_comment: 'Slightly worse'
        },
        inspector_performance: {
          inspector_name: 'Demo Inspector',
          inspections_done_total: 10,
          lots_rejected_total: 1,
          average_lot_defect_rate_percent: 1.5,
          current_lot_defect_rate_percent: 5.0,
          consistency_comment: 'Normal'
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
      } catch (e) {
        return false;
      }
    }
  },

  // --- Item Master Methods ---

  async getItems(): Promise<ItemMaster[]> {
    try {
      const stored = localStorage.getItem(ITEMS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return DEFAULT_ITEMS;
    } catch (e) {
      return DEFAULT_ITEMS;
    }
  },

  async saveItem(item: ItemMaster): Promise<boolean> {
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
  },

  async deleteItem(itemId: string): Promise<boolean> {
    try {
      const current = await this.getItems();
      const updatedItems = current.filter(i => i.id !== itemId);
      localStorage.setItem(ITEMS_KEY, JSON.stringify(updatedItems));
      return true;
    } catch (e) {
      console.error("Failed to delete item", e);
      return false;
    }
  },

  // --- Supplier Methods ---

  async getSuppliers(): Promise<string[]> {
    return DEFAULT_SUPPLIERS;
  }
};