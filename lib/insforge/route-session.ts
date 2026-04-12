import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { jsonError } from './api';
import { createServerInsForgeClient } from './client';
import { persistSessionCookies } from './cookies';
import { type ResolvedSession, getResolvedSessionFromCookies } from './session';

export type ApiSessionContext = {
  session: ResolvedSession;
  client: ReturnType<typeof createServerInsForgeClient>;
};

export async function getApiSessionContext(): Promise<
  { ok: true; ctx: ApiSessionContext } | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies();
  const session = await getResolvedSessionFromCookies(cookieStore);

  if (!session) {
    return {
      ok: false,
      response: jsonError(401, 'UNAUTHENTICATED', 'You must be signed in to access this resource.'),
    };
  }

  const client = createServerInsForgeClient(session.accessToken);

  return {
    ok: true,
    ctx: { session, client },
  };
}

export function withSessionCookies(response: NextResponse, session: ResolvedSession) {
  return persistSessionCookies(response, {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
}
