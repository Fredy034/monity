import { NextResponse } from 'next/server';

import { todayDateOnly } from '@/lib/finance/recurring';
import { jsonError } from '@/lib/insforge/api';
import { createServerInsForgeClient } from '@/lib/insforge/client';

function resolveCronToken(request: Request) {
  const headerToken = request.headers.get('x-cron-token');
  if (headerToken) return headerToken;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
}

export async function POST(request: Request) {
  const requiredCronToken = process.env.RECURRING_CRON_TOKEN ?? null;
  const providedToken = resolveCronToken(request);

  if (!requiredCronToken || !providedToken || providedToken !== requiredCronToken) {
    return jsonError(401, 'UNAUTHORIZED', 'Missing or invalid cron token.');
  }

  const client = createServerInsForgeClient();
  const runDate = todayDateOnly();

  const { data, error } = await client.database.rpc('apply_due_recurring_expenses_for_all', {
    p_up_to_date: runDate,
  });

  if (error) {
    return jsonError(500, 'RECURRING_JOB_FAILED', error.message);
  }

  const processedUsers = Array.isArray(data) && data[0]?.processed_users ? Number(data[0].processed_users) : 0;

  return NextResponse.json({
    data: {
      run_date: runDate,
      processed_users: processedUsers,
    },
  });
}
