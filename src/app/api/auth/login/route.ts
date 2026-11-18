import { admin, fail, issueSession, noStore } from '@/lib/day-server';
import { allowAttempt, burnPasswordCheck, findUser, normalizeUsername, verifyPassword } from '@/lib/accounts-server';
import { detachPushEndpoint } from '@/lib/session-server';

export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return fail('Origen no válido.', 403);
  try {
    const { username, password, endpoint } = await request.json();
    const name = normalizeUsername(username);
    if (!await allowAttempt(request, 'login')) return fail('Demasiados intentos. Espera 15 minutos.', 429);
    if (!name || typeof password !== 'string' || !password || password.length > 128) return fail('Usuario o contraseña incorrectos.', 401);
    const user = await findUser(name);
    if (!user) { await burnPasswordCheck(password); return fail('Usuario o contraseña incorrectos.', 401); }
    if (!await verifyPassword(password, user.password_hash)) return fail('Usuario o contraseña incorrectos.', 401);
    await detachPushEndpoint(user.profile, endpoint);
    await admin().from('luden_users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);
    await issueSession(user.profile);
    return Response.json({ authenticated: true, profile: { id: user.profile, name: user.display_name, username: user.username } }, { headers: noStore });
  } catch { return fail('No se pudo iniciar sesión.', 503); }
}
