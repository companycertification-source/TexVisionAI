# TexVision AI 🧵✨

**TexVision AI** is an intelligent quality control assistant designed for the **Textile & Garment Industry**. It leverages the **Google Gemini 2.5 Flash API** to perform visual inspections of fabrics and garments, detecting defects (stains, holes, shading), reading labels (OCR), and analyzing conformity against specifications.

<div align="center">

![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)
![Gemini API](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange?logo=google)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## 🚀 Key Features

### Core AI Capabilities
- **Textile Defect Detection** - Automatically detects issues like oil stains, holes, tears, skipped stitches, and color shading.
- **Garment Logic** - Understands folded vs. hanging garments, rolls vs. bales.
- **Intelligent OCR** - Extracts and validates Style Numbers, Size Labels, Care Instructions, and Fabric Composition.
- **Reference Comparison** - Compares inspected items against "Golden Sample" images or accepted fabric swatches.

### Quality Management
- **AQL Calculator** - Built-in ISO 2859-1 (AQL) calculator for determing sample sizes.
- **Item Master** - specific to Style Numbers, Fabric Types, and GSM specifications.
- **Traceability** - Links inspections to PO Numbers, Batch IDs, and Suppliers.

### Analytics & Reporting
- **Automated Reporting** - Generates PDF-ready reports with defect heatmaps and overlays.
- **Supplier Scorecards** - Track vendor performance over time (Fabric vs. Trims vs. CMT).
- **Inspector Analytics** - Monitor consistency across different QC lines.

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, Vite 6, TypeScript 5.8 |
| **Styling** | Tailwind CSS (CDN) |
| **AI/LLM** | Google Generative AI SDK (`@google/genai`) - Model: `gemini-2.5-flash` |
| **State** | React Context + Hooks |
| **Storage** | LocalStorage (default), Supabase (optional) |

---

## ⚙️ Configuration & Setup

### 1. Prerequisites
- Node.js v18 or higher
- A Google Cloud Project with the Gemini API enabled
- An API Key from [Google AI Studio](https://aistudio.google.com/)

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/your-username/texvision-ai.git
cd texvision-ai

# Install dependencies
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Required: Google Gemini API Key
VITE_API_KEY=your_gemini_api_key_here

# Optional: Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Running the App

```bash
# Development server
npm run dev
```

---

## 📖 Usage Workflow

1. **Login** - Use the demo login.
2. **Context** - Select "Incoming Inspection" (Fabric) or "Finished Goods" (Garments).
3. **Item Selection** - Choose a Style Number (e.g., `SHIRT-BLU-001`) from the **Item Master**.
4. **Sampling** - Enter Lot Size to calculate AQL sample size.
5. **Capture** - Upload images of the fabric roll or garment.
6. **Analysis** - AI identifies defects and verifies label data against the spec.
7. **Report** - Accept or Reject the lot based on the criticality of defects found.

---

## 🧠 AI Implementation Details

The application uses a **Textile-Specific System Prompt** (`constants.ts`) to guide the Gemini model.
- **Defect Taxonomy**: Explicitly trained (via prompt context) to look for "slubs", "nebs", "stains", "broken stitches".
- **Structured Output**: Enforces a strict JSON schema compatible with the application's `InspectionReport` interface.

---

## 📂 Project Structure

```
texvision-ai/
├── components/              # React UI components (InspectionForm, ReportView, etc.)
├── hooks/                   # Custom React hooks (useInspection)
├── services/                # Backend services (geminiService, dataService)
├── types.ts                 # TypeScript interfaces (TextileItem, Defect, etc.)
├── constants.ts             # AI System Prompt & Configurations
├── App.tsx                  # Main Application Component
└── ...
```

---

## 📄 License

MIT License.
