/// <reference types="vite/client" />

/**
 * VITE_* variables are inlined into the production bundle at build time and are
 * therefore public. Never put a secret behind this prefix.
 */
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
