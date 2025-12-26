
export const getEnv = (key: string): string => {
  // 1. Check for Vite's import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const val = (import.meta.env as Record<string, string>)[key] || (import.meta.env as Record<string, string>)[`VITE_${key}`];
    if (val) return val;
  }

  // 2. Check for global process (Node.js/Webpack/Next.js/Vercel)
  try {
    if (typeof process !== 'undefined' && process.env) {
      // Check standard, VITE_ prefixed, and NEXT_PUBLIC_ prefixed
      const val = process.env[key] || process.env[`VITE_${key}`] || process.env[`NEXT_PUBLIC_${key}`];
      if (val) return val;
    }
  } catch (e) {
    // Ignore ReferenceErrors if process is not defined
  }

  return '';
};

/**
 * Get the Gemini API key from environment variables
 * Supports multiple naming conventions:
 * - VITE_API_KEY (preferred for Vite)
 * - GEMINI_API_KEY (common naming)
 * - API_KEY (simple)
 */
export const getApiKey = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const env = import.meta.env;

    // Check all possible API key variable names
    const key = env.VITE_API_KEY ||
      (env as Record<string, string>).GEMINI_API_KEY ||
      (env as Record<string, string>).VITE_GEMINI_API_KEY ||
      (env as Record<string, string>).API_KEY;
    if (key) return key;
  }

  // Fallback to process.env for SSR/Node environments
  try {
    if (typeof process !== 'undefined' && process.env) {
      const key = process.env.VITE_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.API_KEY;
      if (key) return key;
    }
  } catch (e) {
    // Ignore
  }

  return '';
};
