import { admin, fail, issueSession, noStore } from '@/lib/day-server';
import { allowAttempt, credentialsError, hashPassword, normalizeUsername } from '@/lib/accounts-server';
import { waitForProfileTables } from '@/lib/session-server';

export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return fail('Origen no válido.', 403);
  if (process.env.REGISTRATION_DISABLED === '1') return fail('El registro está cerrado en este momento.', 403);
  try {
    const { name, username, password } = await request.json();
    const displayName = typeof name === 'string' ? name.trim() : '';
    const user = normalizeUsername(username);
    if (!displayName || displayName.length > 60) return fail('Escribe tu nombre (máximo 60 caracteres).');
    const invalid = credentialsError(user, password);
    if (invalid) return fail(invalid);
    if (!await allowAttempt(request, 'register')) return fail('Demasiados intentos. Espera 15 minutos.', 429);
    const result = await admin().rpc('luden_register_user', { p_username: user, p_display_name: displayName, p_password_hash: await hashPassword(password) });
    if (result.error?.code === '23505') return fail('Ese usuario ya existe. Elige otro.', 409);
    if (result.error || typeof result.data !== 'string') return fail('No se pudo crear la cuenta. Vuelve a intentarlo.', 503);
    await waitForProfileTables(result.data);
    await issueSession(result.data);
    return Response.json({ authenticated: true, profile: { id: result.data, name: displayName, username: user } }, { status: 201, headers: noStore });
  } catch { return fail('No se pudo crear la cuenta. Vuelve a intentarlo.', 503); }
}
