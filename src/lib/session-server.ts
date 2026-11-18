import { admin } from './day-server';
import { allProfiles } from './accounts-server';
import { profileTable, type ProfileId } from './profiles';

/** A device's push subscription belongs to one profile only: remove it from the others. */
export async function detachPushEndpoint(profile: ProfileId, endpoint: unknown) {
  if (typeof endpoint !== 'string' || !endpoint || endpoint.length >= 4096) return;
  for (const other of await allProfiles()) if (other !== profile) {
    const removed = await admin().from(profileTable('luden_push_subscriptions', other)).delete().eq('endpoint', endpoint);
    if (removed.error) throw new Error('No se pudieron separar los avisos del dispositivo.');
  }
}

/** New tables become visible to the REST API after its schema cache reloads (usually < 1 s). */
export async function waitForProfileTables(profile: ProfileId) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = await admin().from(profileTable('luden_settings', profile)).select('id').limit(1);
    if (!result.error) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
}
