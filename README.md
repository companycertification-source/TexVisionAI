# WeldVision AI 🏗️⚡ - Production Ready

**WeldVision AI** is an intelligent quality control assistant designed for welding electrode manufacturing. It leverages the **Google Gemini 2.5 Flash API** to perform visual inspections, detecting defects, reading text (OCR), and analyzing conformity against ISO standards.

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
- **AI Visual Inspection** - Automatically detects defects such as coating chips, dents, tears, moisture damage, and weld defects
- **Intelligent OCR** - Extracts and validates Batch IDs, Product Codes, Manufacturing Dates, and Branding from images
- **Spatial Analysis** - Returns bounding boxes for defects, rendered as interactive overlays on the canvas
- **Context-Aware Analysis** - Compares current samples against "Golden Samples" and historical defect patterns

### Quality Management
- **ISO 2859-1 (AQL) Calculator** - Built-in sampling plan calculator to determine sample sizes and acceptance/rejection limits
- **Item Master Catalogue** - Manage product specifications, reference images (Accept/Reject standards), and quality checkpoints
- **Traceability** - Generates QR codes for items and printable traceability tags for physical samples

### Analytics & Reporting
- **Automated Reporting** - Generate comprehensive inspection reports with charts and overlays
- **Supplier Analytics** - Track supplier quality trends and defect rates over time
- **Inspector Analytics** - Monitor inspector strictness/consistency metrics

### Production-Ready Features
- **Image Compression** - 85% storage reduction with smart thumbnail generation
- **Error Boundaries** - Graceful error handling with user-friendly recovery UI
- **Rate Limiting** - Prevents API spam with 3-second cooldown and visual countdown
- **File Validation** - Size (10MB max), type, and count validation on uploads
- **Memory Optimization** - Automatic Blob URL cleanup prevents memory leaks
- **Scalable Storage** - Supabase integration supports 1000+ inspections/day
- **Offline-First** - LocalStorage persistence with optional cloud sync
- **Mobile Responsive** - Works on all device sizes

### Security & Compliance
- **Authentication** - Email/password login with session management
- **Session Timeout** - 8-hour auto-expiry for security
- **Audit Logging** - All login/logout and key actions logged
- **Supabase Auth Ready** - Production-grade authentication when configured

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, Vite 6, TypeScript 5.8 |
| **Styling** | Tailwind CSS (CDN) |
| **AI/LLM** | Google Generative AI SDK (`@google/genai`) - Model: `gemini-2.5-flash` |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Testing** | Vitest, React Testing Library |
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
git clone https://github.com/your-username/weldvision-ai.git
cd weldvision-ai

# Install dependencies
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Required: Google Gemini API Key
VITE_API_KEY=your_gemini_api_key_here

# Optional: Supabase Configuration (for scalable cloud storage)
# If omitted, the app defaults to LocalStorage
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Running the App

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

Open the URL shown in your terminal (typically `http://localhost:5173` or `http://localhost:3001`).

---

## 📖 Usage Workflow

1. **Login** - Use the demo login button (or configure authentication)
2. **Context** - Select "Incoming Inspection" or "Finished Goods", then select the Supplier
3. **Item & Traceability** - Select a product from the **Item Master** (or enter manually). Enter PO Number and Batch
4. **Sampling** - Enter the **Lot Size**. The app calculates the required sample size based on AQL Level II (ISO 2859-1)
5. **Capture** - Upload images or use the camera to capture the samples
6. **Analysis** - Click "Run Analysis". Gemini analyzes the images against the defined specs and reference images
7. **Report** - Review the AI's findings, check the overlays, and make a final Accept/Reject decision

---

## 🧠 AI Implementation Details

The application uses a "One-Shot" prompting strategy with `gemini-2.5-flash`.

### Prompting Strategy
- **System Prompt** - Defined in `constants.ts`. Enforces a strict JSON output schema containing inspection headers, defect lists, and summary text
- **Context Injection** - The `analyzeInspection` service injects:
  - Historical data (supplier performance trends)
  - Reference standard images (Base64 "Golden Samples")
  - Item specifications and quality checkpoints
- **Spatial Analysis** - Returns bounding boxes (`[y, x, h, w]`) for defects, rendered as interactive overlays

### API Resilience
- **Retry Logic** - Exponential backoff for 503/429 errors
- **JSON5 Parsing** - Lenient parsing for AI-generated JSON
- **Error Recovery** - Graceful fallbacks with user-friendly messages

---

## 📂 Project Structure

```
weldvision-ai/
├── components/              # React UI components
│   ├── ErrorBoundary.tsx     # Graceful error handling wrapper
│   ├── HistoryView.tsx       # Inspection history with pagination
│   ├── InspectionForm.tsx    # Multi-step inspection wizard + AQL calculator
│   ├── InspectorView.tsx     # Inspector performance analytics
│   ├── ItemCenter.tsx        # Item master CRUD + reference images
│   ├── LoginView.tsx         # Login screen with "How It Works" modal
│   ├── OverlayImage.tsx      # Image viewer with defect overlays
│   ├── ReportView.tsx        # Full report with charts and summary
│   └── SupplierView.tsx      # Supplier performance analytics
├── hooks/                   # Custom React hooks
│   ├── useAppNavigation.ts   # Navigation state management
│   ├── useInspection.ts      # Inspection workflow logic
│   └── useRateLimit.ts       # Rate limiting utilities
├── contexts/                # React context providers
│   └── AuthContext.tsx       # Authentication state management
├── services/                # Backend services
│   ├── auditService.ts       # Compliance audit logging
│   ├── dataService.ts        # Data persistence (LocalStorage/Supabase)
│   ├── geminiService.ts      # AI analysis, image resizing, prompt construction
│   ├── storageService.ts     # Supabase Storage for images
│   └── supabaseClient.ts     # Supabase client configuration
├── utils/                   # Utility functions
│   ├── env.ts                # Environment variable helper
│   ├── fileValidation.ts     # Upload validation (size, type, count)
│   └── imageCompression.ts   # Image compression (85% reduction)
├── App.tsx                  # Main application with error boundaries
├── types.ts                 # TypeScript interfaces (InspectionReport, Defect, etc.)
├── constants.ts             # AI system prompts and configuration
├── index.tsx                # Application entry point
├── DEPLOYMENT.md            # Deployment guide
└── PRODUCTION_CHECKLIST.md  # Pre-launch verification
```

---

## 🧪 Testing

```bash
# Run tests in watch mode
npm test

# Run tests once (CI mode)
npm test -- --run

# Run with verbose output
npm test -- --reporter=verbose
```

### Test Coverage

| Module | Tests | Status |
|--------|-------|--------|
| Services (dataService, geminiService) | 11 | ✅ |
| Utilities (fileValidation, imageCompression) | 9 | ✅ |
| Hooks (useInspection) | 2 | ✅ |
| Components (App) | 1 | ✅ |

---

## 📊 Storage & Scaling

| Configuration | Capacity | Best For | Monthly Cost |
|---------------|----------|----------|--------------|
| LocalStorage only | ~50 reports | Development, demos | $0 |
| Supabase Free | 100-200/day | Small teams | $0 |
| Supabase Pro | 1000+/day | Production | $25 |

### Image Compression

Images are automatically compressed for storage efficiency:

| Stage | Resolution | Quality | Size |
|-------|------------|---------|------|
| AI Analysis | 1024px max | 80% | ~200-800KB |
| History Storage | 400px max | 60% | **~50-100KB** |

**Result: 85% storage reduction** - enabling 6x more inspections per storage limit.

---

## 🚢 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Quick Deploy

```bash
# Vercel (recommended)
npx vercel --prod

# Netlify
npx netlify deploy --prod

# Any static host
npm run build
# Deploy the dist/ folder
```

---

## 🔒 Security

- ✅ API keys stored in environment variables (never committed)
- ✅ `.env.local` in `.gitignore`
- ✅ Input validation on all file uploads
- ✅ Error messages don't expose internal details
- ✅ Rate limiting prevents API abuse
- ✅ TypeScript strict mode for type safety

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI vision capabilities
- [Supabase](https://supabase.com/) - Backend infrastructure
- [Recharts](https://recharts.org/) - Chart components
- [Lucide](https://lucide.dev/) - Icon library
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework

---

<div align="center">

**Built with ❤️ for Quality Control**

[Report Bug](../../issues) · [Request Feature](../../issues) · [Deployment Guide](DEPLOYMENT.md)

</div>
