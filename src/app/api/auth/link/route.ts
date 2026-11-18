import { admin, currentProfile, fail, noStore } from '@/lib/day-server';
import { credentialsError, hashPassword, normalizeUsername, profileDisplayName, profileHasAccount } from '@/lib/accounts-server';

// Lets a profile that still signs in with a PIN create its username and password.
export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return fail('Origen no válido.', 403);
  const profile = await currentProfile();
  if (!profile) return fail('Introduce tu PIN.', 401);
  try {
    const { name, username, password } = await request.json();
    const user = normalizeUsername(username);
    const invalid = credentialsError(user, password);
    if (invalid) return fail(invalid);
    if (await profileHasAccount(profile)) return fail('Este perfil ya tiene usuario y contraseña.', 409);
    const displayName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 60) : await profileDisplayName(profile);
    const result = await admin().rpc('luden_link_account', { p_profile: profile, p_username: user, p_display_name: displayName, p_password_hash: await hashPassword(password) });
    if (result.error?.code === '23505') return fail('Ese usuario ya existe. Elige otro.', 409);
    if (result.error) return fail('No se pudo crear el usuario. Vuelve a intentarlo.', 503);
    return Response.json({ ok: true, username: user }, { headers: noStore });
  } catch { return fail('No se pudo crear el usuario. Vuelve a intentarlo.', 503); }
}
