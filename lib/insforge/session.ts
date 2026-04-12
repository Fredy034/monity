import type { UserSchema } from '@insforge/sdk';

import { createServerInsForgeClient } from './client';

export const AUTH_ACCESS_COOKIE = 'monity_access_token';
export const AUTH_REFRESH_COOKIE = 'monity_refresh_token';
export const AUTH_OAUTH_VERIFIER_COOKIE = 'monity_oauth_code_verifier';

export type AccountStatus = 'active' | 'inactive';

export type UserProfileRow = {
  user_id: string;
  email: string;
  display_name: string | null;
  status: AccountStatus;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthUser = UserSchema & {
  accountStatus: AccountStatus;
  lastLoginAt: string | null;
  displayName: string | null;
};

export type ResolvedSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string | null;
};

type CookieAccessor = {
  get(name: string): { value: string } | undefined;
};

function asAccountStatus(value: unknown): AccountStatus {
  return value === 'inactive' ? 'inactive' : 'active';
}

function mapUser(user: UserSchema, profile?: UserProfileRow | null): AuthUser {
  return {
    ...user,
    accountStatus: asAccountStatus(profile?.status),
    lastLoginAt: profile?.last_login_at ?? null,
    displayName: profile?.display_name ?? user.profile?.name ?? null,
  };
}

export async function getResolvedSession(options: {
  accessToken?: string | null;
  refreshToken?: string | null;
}): Promise<ResolvedSession | null> {
  const accessToken = options.accessToken ?? null;
  const refreshToken = options.refreshToken ?? null;

  if (accessToken) {
    const client = createServerInsForgeClient(accessToken);
    const { data, error } = await client.auth.getCurrentUser();

    if (!error && data.user) {
      const profile = await getUserProfile(accessToken, data.user.id);

      return {
        user: mapUser(data.user, profile),
        accessToken,
        refreshToken,
      };
    }
  }

  if (!refreshToken) {
    return null;
  }

  const refreshClient = createServerInsForgeClient();
  const { data, error } = await refreshClient.auth.refreshSession({
    refreshToken,
  });

  if (error || !data?.accessToken || !data.user) {
    return null;
  }

  const profile = await getUserProfile(data.accessToken, data.user.id);

  return {
    user: mapUser(data.user, profile),
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? refreshToken,
  };
}

export async function getResolvedSessionFromCookies(cookieStore: CookieAccessor) {
  return getResolvedSession({
    accessToken: cookieStore.get(AUTH_ACCESS_COOKIE)?.value ?? null,
    refreshToken: cookieStore.get(AUTH_REFRESH_COOKIE)?.value ?? null,
  });
}

export async function getUserProfile(accessToken: string, userId: string): Promise<UserProfileRow | null> {
  const client = createServerInsForgeClient(accessToken);
  const { data, error } = await client.database
    .from('user_profiles')
    .select('user_id, email, display_name, status, last_login_at, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as UserProfileRow;
}

export async function upsertUserProfile(session: {
  accessToken: string;
  user: UserSchema;
}): Promise<UserProfileRow | null> {
  const client = createServerInsForgeClient(session.accessToken);
  const now = new Date().toISOString();
  const { data, error } = await client.database
    .from('user_profiles')
    .upsert(
      [
        {
          user_id: session.user.id,
          email: session.user.email,
          display_name: session.user.profile?.name ?? null,
          status: 'active',
          last_login_at: now,
          updated_at: now,
        },
      ],
      { onConflict: 'user_id' },
    )
    .select('user_id, email, display_name, status, last_login_at, created_at, updated_at')
    .single();

  if (error || !data) {
    return null;
  }

  return data as UserProfileRow;
}
