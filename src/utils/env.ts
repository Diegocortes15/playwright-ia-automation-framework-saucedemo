import 'dotenv/config';

interface EnvConfig {
  baseUrl: string;
  password: string;
}

function required(key: string): string {
  const value = process.env[key];
  if (!value?.trim()) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const env: EnvConfig = {
  baseUrl: process.env.SAUCEDEMO_BASE_URL ?? 'https://www.saucedemo.com',
  password: required('SAUCEDEMO_PASSWORD'),
};

export interface QaseConfig {
  apiToken: string;
  projectCode: string;
  apiHost: string;
}

// Optional — returns null when TCMS is not configured (capability stays off).
// NOT via required(): absence is the normal "TCMS off" state, not an error.
export function qaseConfig(): QaseConfig | null {
  const apiToken = process.env.QASE_API_TOKEN?.trim();
  const projectCode = process.env.QASE_PROJECT_CODE?.trim();
  if (!apiToken || !projectCode) return null;
  return {
    apiToken,
    projectCode,
    apiHost: process.env.QASE_API_HOST?.trim() || 'https://api.qase.io/v1',
  };
}
