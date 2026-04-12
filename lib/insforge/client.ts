import { createClient } from '@insforge/sdk';

function assertInsForgeConfig() {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL ?? process.env.INSFORGE_URL ?? process.env.INSFORGE_BASE_URL;

  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? process.env.INSFORGE_ANON_KEY;

  if (!baseUrl) {
    throw new Error('Missing InsForge URL. Set NEXT_PUBLIC_INSFORGE_URL (recommended) or INSFORGE_URL in .env.local');
  }

  return { baseUrl, anonKey };
}

export function createPublicInsForgeClient() {
  const config = assertInsForgeConfig();

  return createClient({
    baseUrl: config.baseUrl,
    ...(config.anonKey ? { anonKey: config.anonKey } : {}),
  });
}

export function createServerInsForgeClient(accessToken?: string | null) {
  const config = assertInsForgeConfig();

  return createClient({
    baseUrl: config.baseUrl,
    ...(config.anonKey ? { anonKey: config.anonKey } : {}),
    isServerMode: true,
    edgeFunctionToken: accessToken ?? undefined,
  });
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
}
