/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    GEMINI_API_KEY: string;
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};
