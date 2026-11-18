import type {ProfileId} from './profiles';
import { allProfiles } from './accounts-server';
import webpush from 'web-push';
import { profileAdmin, configValue } from './day-server';
import { dayKey, shiftDay, type Completion, type DayBlock, type DayChange } from './day-plan';
import { notificationEvents } from './notification-events';
import { financeReminderDue, financePayload } from './finance-reminders';
import { readFinanceReminders } from './finance-push-server';
export async function sendPush(subscription:webpush.PushSubscription,payload:Record<string,unknown>,ttl=300,urgency:'high'|'normal'='high') {
  const [publicKey,privateKey]=await Promise.all([configValue('vapid_public'),configValue('vapid_private')]);
  return webpush.sendNotification(subscription,JSON.stringify(payload),{TTL:ttl,urgency,vapidDetails:{subject:'https://luden.work',publicKey,privateKey}});
}
async function dispatchProfile(profile:ProfileId) {
  const db=profileAdmin(profile),now=new Date(),day=dayKey(now),yesterday=shiftDay(day,-1),tomorrow=shiftDay(day,1);
  const [blocks,subscriptions,done,changes]=await Promise.all([db.from('luden_day_blocks').select('*'),db.from('luden_push_subscriptions').select('*'),db.from('luden_day_done').select('block_id,day').gte('day',yesterday).lte('day',tomorrow),db.from('luden_day_changes').select('*').gte('day',yesterday).lte('day',tomorrow)]);
  if(blocks.error||subscriptions.error||done.error||changes.error)throw new Error('No se pudieron leer los avisos.');
  const due=notificationEvents(blocks.data as DayBlock[],now,done.data as Completion[],changes.data as DayChange[]);
  let sent=0,failed=0,skipped=0;
  const expired=new Set<string>();
  for(const event of due)for(const subscription of subscriptions.data) {
    if(expired.has(subscription.id)||subscription.routine_enabled===false)continue;
    const {block,kind}=event;
    const row={subscription_id:subscription.id,block_id:block.id,day:event.day,event_key:event.key};
    const claim=await db.from('luden_push_deliveries').insert(row);
    if(claim.error?.code==='23505'){skipped++;continue;}
    if(claim.error){failed++;continue;}
    try {
      const title=kind==='before'?'En 5 minutos · '+block.title:(block.resumed?'Retomas · ':'Ahora · ')+block.title;
      const body=kind==='before'?`Empieza a las ${block.time} (Madrid).${block.description?' '+block.description:''}`:block.description||'Es la hora de tu actividad.';
      await sendPush(subscription.subscription,{title,body,url:'/hoy',tag:profile+':'+event.day+':'+block.id+':'+event.key},event.ttl);sent++;
    }catch(error) {
      const code=(error as {statusCode?:number}).statusCode;
      if(code===404||code===410){expired.add(subscription.id);await db.from('luden_push_subscriptions').delete().eq('id',subscription.id);}
      else await db.from('luden_push_deliveries').delete().match(row);
      failed++;
    }
  }
  const financeSubscriptions=subscriptions.data.filter(sub=>sub.finance_enabled&&financeReminderDue(now,sub.finance_hour)&&!expired.has(sub.id));
  if(financeSubscriptions.length){
    const {privateReminder,detailedReminder}=await readFinanceReminders(profile);
    for(const subscription of financeSubscriptions){
      const reminder=subscription.finance_details?detailedReminder:privateReminder;
      if(!reminder)continue;
      const row={subscription_id:subscription.id,day};
      const claim=await db.from('luden_finance_push_deliveries').insert(row);
      if(claim.error?.code==='23505'){skipped++;continue;}
      if(claim.error){failed++;continue;}
      try{await sendPush(subscription.subscription,financePayload(now,reminder),600,'normal');sent++;}
      catch(error){
        const code=(error as {statusCode?:number}).statusCode;
        if(code===404||code===410)await db.from('luden_push_subscriptions').delete().eq('id',subscription.id);
        else await db.from('luden_finance_push_deliveries').delete().match(row);
        failed++;
      }
    }
  }
  console.info('luden notifications',JSON.stringify({sent,failed,skipped,due:due.length}));
  return {sent,failed,skipped};
}

export async function dispatchNotifications(){const total={sent:0,failed:0,skipped:0};for(const profile of await allProfiles()){try{const result=await dispatchProfile(profile);total.sent+=result.sent;total.failed+=result.failed;total.skipped+=result.skipped;}catch{total.failed++;console.error('No se pudieron enviar los avisos de un perfil.');}}return total;}
