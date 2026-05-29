import 'dotenv/config';

// Qase TCMS config reader — deliberately separate from env.ts so importing it
// (from the optional src/tcms/ sync path) does NOT trigger env.ts's eager
// required('SAUCEDEMO_PASSWORD') throw. Absence here is the normal "TCMS off"
// state, never an error.
export interface QaseConfig {
  apiToken: string;
  projectCode: string;
  apiHost: string;
}

// Returns null when TCMS is not configured (capability stays off).
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
