

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Defect {
  class: string;
  severity: 'minor' | 'major' | 'critical';
  description: string;
  count: number;
  locations: number[][]; // [x, y, w, h]
}

export interface Overlay {
  region_type: 'defect' | 'ocr_region' | 'object';
  defect_class?: string;
  region_label?: string;
  severity?: 'minor' | 'major' | 'critical';
  bbox: number[]; // [x, y, w, h]
}

export interface InspectionObject {
  type: string;
  bbox: number[];
  damage_class?: string;
  cleanliness?: string;
  artwork_conformity?: string;
}

export interface Electrode {
  bbox: number[];
  geometry?: string;
  coating_condition?: string[];
  tip_condition?: string;
  marking_status?: string;
}

export interface OCRResults {
  brand: string;
  grade: string;
  size: string;
  batch_lot_number: string;
  mfg_date: string;
  exp_date: string;
  other_text: string[];
  confidence: number;
}

export interface ImageResult {
  image_id: string;
  status: 'accepted' | 'accepted_with_minor_defects' | 'rejected';
  ocr_results: OCRResults;
  objects: InspectionObject[];
  electrodes: Electrode[];
  defects: Defect[];
  counts: {
    visible_cartons: number;
    visible_packets: number;
    visible_electrodes: number;
  };
  overlays: Overlay[];
}

export interface DefectSummary {
  class: string;
  count: number;
  percentage: number;
  description?: string; // Brief characteristic of this defect type in the lot
}

export interface LotAssessment {
  lot_status: 'accept' | 'accept_with_remarks' | 'reject';
  total_cartons_inspected: number;
  total_packets_inspected: number;
  total_electrodes_sampled: number;
  defect_summary: DefectSummary[];
  critical_defects_present: boolean;
  critical_defect_details: string[];
  conformity_summary: {
    product_match_spec: boolean;
    branding_match_spec: boolean;
    batch_and_dates_present: boolean;
  };
  trend_comment: string;
}

export interface SupplierPerformance {
  supplier_name: string;
  lots_inspected_total: number;
  lots_rejected_total: number;
  lots_accepted_with_remarks_total: number;
  current_lot_defect_rate_percent: number;
  historical_average_defect_rate_percent: number;
  current_vs_history_comment: string;
}

export interface InspectorPerformance {
  inspector_name: string;
  inspections_done_total: number;
  lots_rejected_total: number;
  average_lot_defect_rate_percent: number;
  current_lot_defect_rate_percent: number;
  consistency_comment: string;
}

export interface PerformanceInsights {
  supplier_performance: SupplierPerformance;
  inspector_performance: InspectorPerformance;
}

export interface InspectionHeader {
  inspection_type: string;
  supplier_name: string;
  brand: string;
  product_code: string;
  po_number: string;
  invoice_number: string;
  batch_lot_number: string;
  inspection_date_time: string;
  inspector_name: string;
  customer_reference: string;
  spec_limits: string;
}

export interface InspectionReport {
  inspection_header: InspectionHeader;
  images: ImageResult[];
  lot_assessment: LotAssessment;
  imageUrls?: string[]; // Changed to array to store multiple images
  summary?: string;
  performance_insights?: PerformanceInsights;
}

export interface ItemMaster {
  id: string;
  name: string;
  code: string;
  category: string;
  item_type: 'buy' | 'sell'; // Classification
  preferred_supplier?: string; // Only for 'buy' items
  uom?: string; // Unit of Measure
  dimensions?: string; // e.g. "Dia: 3.2mm, L: 350mm"
  description: string;
  specifications: string;
  quality_checkpoints?: string[];
  reference_image_url?: string;
  // New field for analysis standards
  standard_images?: {
    accepted: string[]; // List of base64 strings (max 2)
    rejected: string[]; // List of base64 strings (max 2)
  };
  // AQL Preferences
  aql_config?: {
    level: 'I' | 'II' | 'III'; // General Inspection Level
    major: number; // e.g., 2.5
    minor: number; // e.g., 4.0
  };
}

export interface MetaData {
  inspection_type: 'incoming' | 'finished_goods' | 'loose_packed';
  supplier_name: string;
  brand: string;
  product_code: string;
  po_number: string;
  invoice_number?: string;
  batch_lot_number?: string;
  inspector_name: string;
  customer_reference?: string;
  spec_limits: string;
  previous_findings?: string | object;
  // AQL Fields
  lot_size?: number;
  sample_size?: number;
  aql_level?: 'I' | 'II' | 'III';
  aql_major?: number;
  aql_minor?: number;
  acceptance_limits?: {
    major_ac: number;
    major_re: number;
    minor_ac: number;
    minor_re: number;
  };
  // Inspection Mode for cost optimization
  inspection_mode?: 'quick' | 'detailed';
}

export interface AppState {
  step: 'login' | 'input' | 'analyzing' | 'report' | 'history' | 'suppliers' | 'items' | 'inspectors' | 'admin';
  previousStep?: 'history' | 'suppliers' | 'input' | 'items' | 'inspectors' | 'admin';
  meta: MetaData;
  history: InspectionReport[];
  items: ItemMaster[];
  selectedFiles: File[]; // Changed from single File to File[]
  previewUrls: string[]; // Changed from single URL to string[]
  report: InspectionReport | null;
  summary: string | null;
  error: string | null;
}