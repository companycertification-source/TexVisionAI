# TexVision AI - Deployment Guide

## 🚀 Production Deployment

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+ or yarn 1.22+
- Google Cloud account with Gemini API access
- (Optional) Supabase account for scalable storage

---

## 📋 Environment Variables

Create a `.env.local` file with the following:

```bash
# Required: Google Gemini API Key
VITE_API_KEY=your-gemini-api-key

# Optional: Supabase (for scalable storage - recommended for production)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Getting API Keys

#### Google Gemini API
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Enable the Gemini API in your project

#### Supabase (Optional but Recommended)
1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get URL and anon key from Project Settings → API
4. Create storage bucket named `inspection-images`
5. Create database table (see below)

---

## 🗄️ Supabase Setup (if using)

### 1. Create Storage Bucket

```sql
-- In Supabase SQL Editor or Dashboard
-- Create bucket: inspection-images
-- Set to PUBLIC for image viewing
```

### 2. Create Database Table

```sql
CREATE TABLE inspections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_name TEXT,
  po_number TEXT,
  inspector_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  report_data JSONB
);

-- Create index for faster queries
CREATE INDEX idx_inspections_created_at ON inspections(created_at DESC);
CREATE INDEX idx_inspections_supplier ON inspections(supplier_name);
```

### 3. Set Row Level Security (Optional)

```sql
-- Enable RLS
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (for demo purposes)
CREATE POLICY "Allow public access" ON inspections FOR ALL USING (true);
```

---

## 🏗️ Build & Deploy

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Production Build

```bash
# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard
# Settings → Environment Variables
```

### Deploy to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Set environment variables in Netlify Dashboard
```

### Deploy to Custom Server

```bash
# Build
npm run build

# Serve the dist folder with any static file server
npx serve dist

# Or with nginx, configure root to point to dist/
```

---

## 📊 Scaling Guide

### Storage Capacity by Configuration

| Configuration | Images/Day | Monthly Cost | Duration |
|---------------|------------|--------------|----------|
| LocalStorage only | 20-50 | $0 | ∞ (resets) |
| Supabase Free | 100-200 | $0 | 1-2 months |
| Supabase Pro | 1000+ | $25 | Years |

### Gemini API Quotas

| Tier | Requests/Min | Requests/Day | Monthly Cost |
|------|--------------|--------------|--------------|
| Free | 2 | 50 | $0 |
| Pay-as-you-go | 60 | 1500 | ~$10-50 |
| Enterprise | Unlimited | Unlimited | Custom |

---

## 🔒 Security Checklist

- [ ] API keys stored in environment variables (not committed)
- [ ] `.env.local` is in `.gitignore`
- [ ] HTTPS enabled in production
- [ ] Supabase RLS policies configured
- [ ] No debug console.log in production
- [ ] Error messages don't expose sensitive data

---

## 🐛 Troubleshooting

### "API Key is missing"
- Ensure `VITE_API_KEY` is set in environment
- Restart dev server after adding env variables
- For Vercel/Netlify, add env vars in dashboard

### "Storage quota exceeded"
- Configure Supabase for persistent storage
- The app auto-trims localStorage when full

### "Image analysis failed"
- Check Gemini API quota limits
- Ensure images are under 10MB
- Check network connectivity

### Build fails with TypeScript errors
```bash
# Check for type errors
npx tsc --noEmit

# Fix common issues
npm run lint
```

---

## 📈 Monitoring

### Recommended Tools

1. **Error Tracking**: Sentry or LogRocket
2. **Analytics**: Google Analytics or Plausible
3. **Uptime**: UptimeRobot or Pingdom

### Adding Sentry (Optional)

```bash
npm install @sentry/react
```

```typescript
// In main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: import.meta.env.MODE,
});
```

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review console errors in browser DevTools
3. Check Gemini API status at [Google Cloud Status](https://status.cloud.google.com/)

---

## 📝 Version History

- **v2.5.0** - Current production version
  - Image compression (85% size reduction)
  - Supabase Storage support
  - Error boundaries
  - Rate limiting
  - Memory optimization
  - Full mobile support
