import dotenv from 'dotenv';
dotenv.config();

function sanitizeEnv(val?: string): string | undefined {
  if (!val) return undefined;
  let trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed || undefined;
}

export const Config = {
  get SUPABASE_URL() {
    return sanitizeEnv(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get GNANI_API_KEY() {
    return sanitizeEnv(process.env.GNANI_API_KEY);
  },
  get GEMINI_API_KEY() {
    return sanitizeEnv(process.env.GEMINI_API_KEY);
  },
  get PORT() {
    return Number(process.env.PORT) || 3000;
  },
  get NODE_ENV() {
    return process.env.NODE_ENV || 'development';
  },

  validate() {
    const required = [
      'VITE_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'GNANI_API_KEY',
      'GEMINI_API_KEY'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.warn(`[CONFIG WARNING] Missing required environment variables: ${missing.join(', ')}`);
      return false;
    }
    return true;
  }
};


