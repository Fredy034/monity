import { createClient } from '@insforge/sdk';

function normalizeAbsoluteHttpUrl(value: string, variableName: string) {
  const trimmed = value.trim();

  try {
    const parsed = new URL(trimmed);
    const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';

    // Guard against malformed placeholders like "https://api" that lead to DNS failures.
    const hasLikelyRealHost = parsed.hostname.includes('.') || parsed.hostname === 'localhost';

    if (!isHttp || !hasLikelyRealHost) {
      throw new Error();
    }

    return parsed.origin;
  } catch {
    throw new Error(
      `Invalid ${variableName}: "${value}". Expected an absolute http(s) URL (for example, https://your-project.insforge.app).`,
    );
  }
}

function assertInsForgeConfig() {
  const baseUrlRaw = process.env.INSFORGE_URL ?? process.env.NEXT_PUBLIC_INSFORGE_URL ?? process.env.INSFORGE_BASE_URL;

  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? process.env.INSFORGE_ANON_KEY;

  if (!baseUrlRaw) {
    throw new Error('Missing InsForge URL. Set NEXT_PUBLIC_INSFORGE_URL (recommended) or INSFORGE_URL in .env.local');
  }

  const baseUrl = normalizeAbsoluteHttpUrl(baseUrlRaw, 'INSFORGE_URL/NEXT_PUBLIC_INSFORGE_URL');

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
  const rawUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return normalizeAbsoluteHttpUrl(rawUrl, 'APP_URL/NEXT_PUBLIC_APP_URL');
}
