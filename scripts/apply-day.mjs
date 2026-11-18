import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
import postgres from 'postgres';
import webpush from 'web-push';

const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const sql=postgres(env.POSTGRES_URL_NON_POOLING,{max:1,prepare:false});
try {
  await sql.file('supabase/day.sql').simple();
  await sql.file('supabase/day-plans.sql').simple();
  await sql.file('supabase/day-changes.sql').simple();
  const keys=webpush.generateVAPIDKeys();
  for(const [key,value] of Object.entries({vapid_public:keys.publicKey,vapid_private:keys.privateKey,cron_secret:randomBytes(32).toString('hex')})) {
    await sql`insert into public.luden_app_config(key,value) values(${key},${value}) on conflict(key) do nothing`;
  }
  const count=await sql`select count(*)::int as count from public.luden_day_blocks`;
  if(count[0].count===0) {
    const seed=JSON.parse(fs.readFileSync('scripts/day-seed.json','utf8'));
    await sql.begin(async tx=>{for(const block of seed)await tx`insert into public.luden_day_blocks(title,description,time,weekdays,kind,remind) values(${block.title},${block.description},${block.time},${block.weekdays},${block.kind},${block.remind})`;});
  }
  console.log('Routine tables, protected access and initial schedule ready.');
  // Supabase schedules delivery independently of Vercel plan cron limitations.
  await sql`create extension if not exists pg_cron`;
  await sql`create extension if not exists pg_net with schema extensions`;
  await sql`select cron.schedule('aurum-routine-notifications','* * * * *', $$
    select net.http_post(
      url:='https://aurum-luden.vercel.app/api/notifications/dispatch',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select value from public.luden_app_config where key='cron_secret')),
      body:='{}'::jsonb,timeout_milliseconds:=50000
    );
  $$)`;
  console.log('Minute notification scheduler configured.');
  const status=await sql`select (select count(*) from public.luden_day_blocks) as blocks, (select count(*) from cron.job where jobname='aurum-routine-notifications' and active) as active_jobs`;
  console.log(JSON.stringify(status[0]));
}finally{await sql.end();}
