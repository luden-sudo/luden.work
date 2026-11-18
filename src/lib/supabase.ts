import {profileHeader} from "./profile-client";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'aurum-shared' },
    global:{fetch:async(input,init)=>{
      const original=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
      const table=original.pathname.split('/').at(-1);
      const headers=new Headers(init?.headers);headers.delete('apikey');headers.delete('authorization');headers.set('x-aurum-profile',profileHeader());
      const response=await fetch('/api/finance/'+encodeURIComponent(table||'')+original.search,{...init,headers,credentials:'same-origin',cache:'no-store'});
      if(response.status===401&&typeof window!=='undefined')window.dispatchEvent(new Event('aurum-session-expired'));
      return response;
    }},
  },
);

export async function financeRows<T>(table:'luden_transactions'|'luden_debt_payments'):Promise<T[]> {
  const rows:T[]=[];
  for(let offset=0;;offset+=1000){
    const result=await supabase.from(table).select('*').order('date',{ascending:false}).order('id').range(offset,offset+999);
    if(result.error)throw new Error(table==='luden_transactions'?'No se pudieron cargar los movimientos.':'No se pudieron cargar los pagos de deudas.');
    rows.push(...result.data as T[]);
    if(result.data.length<1000)return rows;
  }
}
