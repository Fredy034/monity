import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { createServerInsForgeClient } from '@/lib/insforge/client';
import { clearSessionCookies } from '@/lib/insforge/cookies';
import { AUTH_ACCESS_COOKIE } from '@/lib/insforge/session';

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value ?? null;
  const client = createServerInsForgeClient(accessToken);

  await client.auth.signOut();

  const response = NextResponse.json({ success: true, nextStep: '/sign-in' });
  return clearSessionCookies(response);
}
