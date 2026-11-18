// A profile owns a private set of tables. The original "luden" profile keeps the
// base luden_* tables; every other profile uses <profile>_* copies of them.
// Legacy PIN profiles can be listed in LEGACY_PROFILES ("id:Name,id:Name").
// Registered users get a generated id (u + 10 hex) from the database.
export type ProfileId = string;

const PROFILE_PATTERN = /^[a-z][a-z0-9_]{1,30}$/;
const TABLES = /^luden_(accounts|settings|transactions|budgets|debts|debt_payments|day_blocks|day_done|day_changes|widget_tokens|push_subscriptions|push_deliveries|finance_push_deliveries)$/;

export const OWNER_PROFILE = 'luden';

export function legacyProfiles(): { id: ProfileId; name: string }[] {
  const raw = process.env.LEGACY_PROFILES || 'luden:luden';
  return raw.split(',').map(part => part.trim()).filter(Boolean).map(part => {
    const [id, ...name] = part.split(':');
    return { id: id.trim(), name: name.join(':').trim() || id.trim() };
  }).filter(profile => PROFILE_PATTERN.test(profile.id));
}

export function validProfile(value: unknown): value is ProfileId {
  return typeof value === 'string' && PROFILE_PATTERN.test(value);
}

export function legacyProfileName(id: ProfileId) {
  return legacyProfiles().find(profile => profile.id === id)?.name;
}

export function profileTable(table: string, id: ProfileId) {
  if (!validProfile(id) || !TABLES.test(table)) throw new Error('Recurso de perfil no válido.');
  return id === OWNER_PROFILE ? table : table.replace(/^luden_/, id + '_');
}
