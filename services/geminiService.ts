import { GoogleGenAI } from "@google/genai";
import JSON5 from 'json5';
import { SYSTEM_PROMPT } from "../constants";
import { MetaData, InspectionReport, ItemMaster } from "../types";
import { getApiKey } from "../utils/env";

export interface AnalysisResult {
  report: InspectionReport;
  summary: string;
}

// Helper: Retry specific operation with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStatus = (error as { status?: number }).status;

      // Check for 503 Service Unavailable or 429 Too Many Requests
      const isTransient = errorMessage?.includes('503') || errorMessage?.includes('429') || errorStatus === 503 || errorStatus === 429;

      if (!isTransient && i >= maxRetries - 1) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, i);
      // Only log in development
      // @ts-expect-error - import.meta.env is available in Vite
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        console.warn(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// Helper to resize image to reduce payload size and processing time
const resizeImage = async (input: File | string): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_DIM = 1024; // Resize to max 1024px for speed

      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Canvas context failed"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to base64 jpeg with 0.8 quality
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        resolve({ mimeType: match[1] || 'image/jpeg', data: match[2] || '' });
      } else {
        reject(new Error("Failed to resize image"));
      }
    };
    img.onerror = reject;

    // Load image source
    if (typeof input === 'string') {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target?.result as string; };
      reader.readAsDataURL(input);
    }
  });
};

// Helper to convert stored base64 string to inlineData part (for Reference Images)
const base64ToGenerativePart = (base64String: string, label: string) => {
  let mimeType = 'image/jpeg';
  let data = base64String;

  if (base64String.includes(',')) {
    const parts = base64String.split(',');
    if (parts[1]) data = parts[1];
    const match = parts[0]?.match(/:(.*?);/);
    if (match && match[1]) {
      mimeType = match[1];
    }
  }

  return {
    inlineData: {
      data,
      mimeType,
    }
  };
};

// Robust JSON extractor that handles "JSON first, then Text" format safely using JSON5
const parseGenerativeOutput = (text: string): { report: InspectionReport, summary: string } => {
  const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

  // Find the first opening brace
  const startIndex = cleanText.indexOf('{');
  if (startIndex === -1) throw new Error("No JSON object found in response.");

  // Count braces to find the matching closing brace
  let braceCount = 0;
  let endIndex = -1;

  for (let i = startIndex; i < cleanText.length; i++) {
    if (cleanText[i] === '{') braceCount++;
    else if (cleanText[i] === '}') braceCount--;

    if (braceCount === 0) {
      endIndex = i;
      break;
    }
  }

  // Attempt to parse the extracted JSON block
  if (endIndex !== -1) {
    const jsonString = cleanText.substring(startIndex, endIndex + 1);
    const remainingText = cleanText.substring(endIndex + 1).trim();

    try {
      // Use JSON5 for more lenient parsing (trailing commas, comments, etc.)
      return {
        report: JSON5.parse(jsonString),
        summary: remainingText
      };
    } catch (e) {
      // JSON5 parse failed, will try regex fallback
    }
  }

  // Fallback: simple greedy regex if brace counting or initial parse fails
  const match = cleanText.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return {
        report: JSON5.parse(match[0]),
        summary: cleanText.replace(match[0], '').trim()
      };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown parse error';
      throw new Error(`Failed to parse the structured report data: ${errorMsg}`);
    }
  }

  throw new Error("Invalid JSON structure (unbalanced braces or unparseable).");
};

export const analyzeInspection = async (
  inputs: (File | string)[],
  meta: MetaData,
  historyContext: InspectionReport[] = [],
  itemContext?: ItemMaster
): Promise<AnalysisResult> => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("API Key is missing. Please set VITE_API_KEY or GEMINI_API_KEY in your .env.local file.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelId = "gemini-2.5-flash";

  try {
    // Optimize: Process inputs (files or base64) to Generative Parts WITH RESIZING
    const inspectionImageParts = await Promise.all(inputs.map(async (input) => {
      // Use resizeImage instead of raw getInlineData
      const { data, mimeType } = await resizeImage(input);
      return {
        inlineData: { data, mimeType }
      };
    }));

    // Construct the parts array
    const parts: any[] = [];

    // 1. Inject Reference Images if available
    let hasReferenceImages = false;
    if (itemContext?.standard_images) {
      if (itemContext.standard_images.accepted?.length > 0) {
        hasReferenceImages = true;
        parts.push({ text: "### REFERENCE STANDARDS: ACCEPTABLE (PASS) ###\nUse these images as the gold standard for quality. Items matching this appearance should be accepted." });
        itemContext.standard_images.accepted.forEach((img) => {
          parts.push(base64ToGenerativePart(img, "Acceptable"));
        });
      }

      if (itemContext.standard_images.rejected?.length > 0) {
        hasReferenceImages = true;
        parts.push({ text: "### REFERENCE STANDARDS: UNACCEPTABLE (FAIL) ###\nUse these images as examples of defects. Items matching these defects must be rejected." });
        itemContext.standard_images.rejected.forEach((img) => {
          parts.push(base64ToGenerativePart(img, "Rejected"));
        });
      }
    }

    // 2. Inject Inspection Images
    parts.push({ text: `### INSPECTION TARGETS ###\nAnalyze the following ${inputs.length} image(s) against the reference standards provided above (if any) and the written specifications.` });
    parts.push(...inspectionImageParts);

    // Calculate real history metrics to pass to the AI
    const supplierHistory = historyContext.filter(h => h.inspection_header.supplier_name === meta.supplier_name);
    const inspectorHistory = historyContext.filter(h => h.inspection_header.inspector_name === meta.inspector_name);

    const supplierStats = {
      total_lots: supplierHistory.length,
      rejected_lots: supplierHistory.filter(h => h.lot_assessment.lot_status === 'reject' || (h.lot_assessment.lot_status as string) === 'rejected').length,
      avg_defect_rate: supplierHistory.length > 0
        ? supplierHistory.reduce((acc, curr) => acc + (curr.performance_insights?.supplier_performance?.current_lot_defect_rate_percent || 0), 0) / supplierHistory.length
        : 0
    };

    const inspectorStats = {
      total_inspections: inspectorHistory.length,
      rejected_lots: inspectorHistory.filter(h => h.lot_assessment.lot_status === 'reject' || (h.lot_assessment.lot_status as string) === 'rejected').length
    };

    // Prepare context data
    const contextData: Record<string, unknown> = {
      supplier_history: {
        [meta.supplier_name]: supplierStats
      },
      inspector_history: {
        [meta.inspector_name || 'Inspector']: inspectorStats
      }
    };

    // Inject Item Master Context if available
    if (itemContext) {
      contextData.master_item_reference = {
        name: itemContext.name,
        code: itemContext.code,
        uom: itemContext.uom,
        official_specs: itemContext.specifications,
        quality_checkpoints: itemContext.quality_checkpoints,
        description: itemContext.description,
        note: "Compare visual findings strictly against the official specs and verify all quality checkpoints."
      };
    }

    // Enrich meta
    const enrichedMeta = {
      ...meta,
      inspection_date_time: new Date().toISOString(),
      previous_findings: contextData
    };

    let specificInstructions = "";
    if (hasReferenceImages) {
      specificInstructions += `
    CRITICAL: Reference standard images have been provided above. 
    In your summary, you MUST explicitly compare the visual appearance of the inspection images against these standards. 
    - Does the item look like the 'Acceptable' standard?
    - Does it show defects similar to the 'Rejected' standard?
    - Mention specific visual features (color, texture, shape) that match or deviate.`;
    }

    const promptText = `
    Here is the metadata for this inspection involving ${inputs.length} image(s):
    ${JSON.stringify(enrichedMeta, null, 2)}
    
    Analyze the attached images based on the system instructions.
    ${specificInstructions}
    
    If 'quality_checkpoints' are provided in the master_item_reference, explicitly evaluate each checkpoint in the summary.
    Ensure the JSON output includes an entry in the 'images' array for each uploaded image.
    `;

    // 3. Add Prompt Text
    parts.push({ text: promptText });

    // Use Retry Logic for the API Call
    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: modelId,
        contents: {
          parts: parts
        },
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.1,
        }
      });
    });

    const text = response.text;
    if (!text) throw new Error("No response text received from Gemini.");

    // Use robust parsing
    const { report, summary } = parseGenerativeOutput(text);

    if (!report) throw new Error("Failed to generate report.");

    return { report, summary };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(errorMessage || "An unexpected error occurred during inspection analysis.");
  }
};