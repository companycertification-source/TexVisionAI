

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Defect {
  class: string;
  category?: 'fabric' | 'workmanship' | 'trims' | 'packaging' | 'other';
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
  type: string; // e.g., "fabric_roll", "garment_folded", "garment_hanging", "carton"
  bbox: number[];
  damage_class?: string;
  cleanliness?: string;
  packaging_conformity?: string;
}

export interface TextileItem {
  bbox: number[];
  fabric_type?: string;
  color_shade?: string;
  pattern_match?: string; // "matched", "mismatched", "not_applicable"
  finish_quality?: string; // "smooth", "wrinkled", "pilling", "unknown"
}

export interface OCRResults {
  brand: string;
  style_number: string; // Replaces product_code/grade
  material_composition: string; // e.g., "100% Cotton"
  size_label: string; // e.g., "L", "XL", "32"
  batch_lot_number: string;
  mfg_date: string;
  care_instructions: string[];
  other_text: string[];
  confidence: number;
}

export interface ImageResult {
  image_id: string;
  status: 'accepted' | 'accepted_with_minor_defects' | 'rejected';
  ocr_results: OCRResults;
  objects: InspectionObject[];
  items: TextileItem[];
  defects: Defect[];
  counts: {
    visible_cartons: number;
    visible_items: number;
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
  total_items_inspected: number;
  defect_summary: DefectSummary[];
  critical_defects_present: boolean;
  critical_defect_details: string[];
  conformity_summary: {
    product_match_spec: boolean;
    branding_match_spec: boolean;
    labeling_present: boolean;
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
  style_number: string; // Replaces product_code
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
  imageUrls?: string[];
  summary?: string;
  performance_insights?: PerformanceInsights;
}

export interface ItemMaster {
  id: string;
  name: string;
  code: string; // Maps to style_number
  category: string;
  item_type: 'buy' | 'sell';
  preferred_supplier?: string;
  uom?: string;
  dimensions?: string;
  description: string;
  specifications: string;
  quality_checkpoints?: string[];
  reference_image_url?: string;
  // Front/Back reference images for garments
  reference_image_front_url?: string;
  reference_image_back_url?: string;
  standard_images?: {
    accepted: string[];
    rejected: string[];
    // For garments: separate front/back accepted images
    accepted_front?: string;
    accepted_back?: string;
  };
  aql_config?: {
    level: 'I' | 'II' | 'III';
    major: number;
    minor: number;
  };
}

export interface MetaData {
  inspection_type: 'incoming' | 'finished_goods' | 'in_process';
  supplier_name: string;
  brand: string;
  style_number: string; // Replaces product_code
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
  inspection_mode?: 'quick' | 'detailed';
}

export interface AppState {
  step: 'login' | 'input' | 'analyzing' | 'report' | 'history' | 'suppliers' | 'items' | 'inspectors' | 'admin';
  previousStep?: 'history' | 'suppliers' | 'input' | 'items' | 'inspectors' | 'admin';
  meta: MetaData;
  history: InspectionReport[];
  items: ItemMaster[];
  selectedFiles: File[];
  previewUrls: string[];
  report: InspectionReport | null;
  summary: string | null;
  error: string | null;
}