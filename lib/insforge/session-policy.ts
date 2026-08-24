export type SessionAccountState = {
  user: {
    accountStatus: string;
  };
};

export function isSessionActive(session: SessionAccountState) {
  return session.user.accountStatus === 'active';
}

export function isUserProfileActive(profile: { status: string } | null | undefined) {
  return profile?.status === 'active';
}

type ProfileRecord = Record<string, unknown>;
type ProfileResult = PromiseLike<{
  data: ProfileRecord | null;
  error: { message: string } | null;
}>;

type ProfileSyncClient = {
  database: {
    from: (table: string) => {
      update: (fields: Record<string, unknown>) => {
        eq: (column: string, value: string) => {
          select: (columns: string) => { maybeSingle: () => ProfileResult };
        };
      };
      insert: (rows: Array<Record<string, unknown>>) => {
        select: (columns: string) => { single: () => ProfileResult };
      };
    };
  };
};

const PROFILE_COLUMNS = 'user_id, email, display_name, status, last_login_at, created_at, updated_at';

export async function synchronizeUserProfile(
  client: ProfileSyncClient,
  userId: string,
  profileFields: Record<string, unknown>,
) {
  const updateExisting = () =>
    client.database
      .from('user_profiles')
      .update(profileFields)
      .eq('user_id', userId)
      .select(PROFILE_COLUMNS)
      .maybeSingle();

  const firstUpdate = await updateExisting();
  if (firstUpdate.error) return null;
  if (firstUpdate.data) return firstUpdate.data;

  const inserted = await client.database
    .from('user_profiles')
    .insert([{ user_id: userId, ...profileFields }])
    .select(PROFILE_COLUMNS)
    .single();

  if (!inserted.error && inserted.data) return inserted.data;

  // Another concurrent authentication may have inserted the row after our first update.
  const racedUpdate = await updateExisting();
  return racedUpdate.error ? null : racedUpdate.data;
}
