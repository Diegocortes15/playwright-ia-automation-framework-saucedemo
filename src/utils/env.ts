import 'dotenv/config';

interface EnvConfig {
  baseUrl: string;
  password: string;
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const env: EnvConfig = {
  baseUrl: process.env.SAUCEDEMO_BASE_URL ?? 'https://www.saucedemo.com',
  password: required('SAUCEDEMO_PASSWORD'),
};
