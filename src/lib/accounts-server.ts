// Username + password accounts. Each account owns one profile (its private tables).
// Passwords are hashed with scrypt and a per-user salt; only the hash is stored.
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { admin, hash } from './day-server';
import { legacyProfileName, legacyProfiles, validProfile, type ProfileId } from './profiles';

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;

export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30})[a-z0-9]$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export function normalizeUsername(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/** Returns a Spanish error message (translated on the client) or null when valid. */
export function credentialsError(username: string, password: unknown) {
  if (!USERNAME_PATTERN.test(username)) return 'El usuario debe tener entre 3 y 32 caracteres: letras, números, punto, guion o guion bajo.';
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) return 'La contraseña debe tener al menos 8 caracteres.';
  if (password.length > PASSWORD_MAX) return 'La contraseña es demasiado larga.';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'La contraseña debe combinar letras y números.';
  return null;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, PARAMS);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltHex, keyHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(password.normalize('NFKC'), Buffer.from(saltHex, 'hex'), expected.length, PARAMS);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// A constant hash so unknown usernames cost the same time as wrong passwords.
let decoy: Promise<string> | null = null;
export async function burnPasswordCheck(password: string) {
  decoy ??= hashPassword('luden-decoy-password-1');
  await verifyPassword(password, await decoy);
}

export function clientAddress(request: Request) {
  return hash(request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'local');
}

/** Shared limiter with the PIN access: 10 attempts per address every 15 minutes. */
export async function allowAttempt(request: Request, scope: string) {
  const result = await admin().rpc('luden_check_pin_rate', { address_hash: scope + ':' + clientAddress(request) });
  if (result.error) throw new Error('No se pudo comprobar el acceso.');
  return Boolean(result.data);
}

export type UserRow = { id: string; username: string; display_name: string; password_hash: string; profile: ProfileId };

export async function findUser(username: string) {
  const result = await admin().from('luden_users').select('id,username,display_name,password_hash,profile').eq('username', username).maybeSingle();
  if (result.error) throw new Error('No se pudo comprobar el acceso.');
  return result.data as UserRow | null;
}

export async function profileDisplayName(profile: ProfileId) {
  const legacy = legacyProfileName(profile);
  try {
    const result = await admin().from('luden_users').select('display_name').eq('profile', profile).maybeSingle();
    if (!result.error && result.data?.display_name) return result.data.display_name as string;
  } catch { /* table may not exist before the accounts migration */ }
  return legacy || profile;
}

export async function profileHasAccount(profile: ProfileId) {
  const result = await admin().from('luden_users').select('id').eq('profile', profile).maybeSingle();
  if (result.error) return false;
  return Boolean(result.data);
}

/** Every profile with data: legacy PIN profiles plus registered accounts. */
export async function allProfiles(): Promise<ProfileId[]> {
  const ids = new Set(legacyProfiles().map(profile => profile.id));
  try {
    for (let offset = 0; ; offset += 1000) {
      const result = await admin().from('luden_users').select('profile').order('created_at').range(offset, offset + 999);
      if (result.error) break;
      for (const row of result.data) if (validProfile(row.profile)) ids.add(row.profile);
      if (result.data.length < 1000) break;
    }
  } catch { /* accounts migration not applied yet */ }
  return [...ids];
}
