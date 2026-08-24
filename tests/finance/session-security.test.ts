import assert from 'node:assert/strict';
import test from 'node:test';

import * as sessionSecurity from '../../lib/insforge/session-policy.ts';

test('rejects an inactive application session', () => {
  const isSessionActive = (sessionSecurity as Record<string, unknown>).isSessionActive;
  assert.equal(typeof isSessionActive, 'function');

  assert.equal(
    (isSessionActive as (session: { user: { accountStatus: string } }) => boolean)({
      user: { accountStatus: 'inactive' },
    }),
    false,
  );
});

test('allows an active application session', () => {
  const isSessionActive = (sessionSecurity as Record<string, unknown>).isSessionActive;
  assert.equal(typeof isSessionActive, 'function');

  assert.equal(
    (isSessionActive as (session: { user: { accountStatus: string } }) => boolean)({
      user: { accountStatus: 'active' },
    }),
    true,
  );
});

test('establishes sessions only for a present active profile', () => {
  const isUserProfileActive = (sessionSecurity as Record<string, unknown>).isUserProfileActive;
  assert.equal(typeof isUserProfileActive, 'function');

  const check = isUserProfileActive as (profile: { status: string } | null) => boolean;
  assert.equal(check(null), false);
  assert.equal(check({ status: 'inactive' }), false);
  assert.equal(check({ status: 'active' }), true);
});

test('recovers when concurrent first-login profile creation loses the insert race', async () => {
  const synchronizeUserProfile = (sessionSecurity as Record<string, unknown>).synchronizeUserProfile;
  assert.equal(typeof synchronizeUserProfile, 'function');

  const updateResults = [
    { data: null, error: null },
    { data: { user_id: 'user-1', status: 'active' }, error: null },
  ];
  let updateIndex = 0;
  const operations: string[] = [];
  const client = {
    database: {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: async () => {
                operations.push('update');
                return updateResults[updateIndex++];
              },
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => {
              operations.push('insert-conflict');
              return { data: null, error: { message: 'duplicate key' } };
            },
          }),
        }),
      }),
    },
  };

  const result = await (
    synchronizeUserProfile as (
      client: unknown,
      userId: string,
      fields: Record<string, unknown>,
    ) => Promise<unknown>
  )(client, 'user-1', { email: 'user@example.com' });

  assert.deepEqual(operations, ['update', 'insert-conflict', 'update']);
  assert.deepEqual(result, { user_id: 'user-1', status: 'active' });
});
