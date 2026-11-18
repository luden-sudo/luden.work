import { authorized, requireProfile, fail, noStore } from '@/lib/day-server';

import {profileTable} from '@/lib/profiles';

const tables=new Set(['luden_accounts','luden_transactions','luden_settings','luden_budgets','luden_debts','luden_debt_payments']);
const parameters=new Set(['select','order','limit','offset','id','category','on_conflict']);
async function handle(request:Request,{params}:{params:Promise<{table:string}>}) {
  if(!await authorized(request))return fail('Introduce tu PIN.',401);
  const {table}=await params;
  if(!tables.has(table))return fail('Recurso no permitido.',404);
  const incoming=new URL(request.url);
  for(const [key,value] of incoming.searchParams){
    if(key==='columns'&&request.method==='POST'&&table==='luden_budgets'&&/^"(?:category|amount)"(?:,"(?:category|amount)")*$/.test(value))continue;
    if(!parameters.has(key)||(key==='select'&&value!=='*')||(['id','category'].includes(key)&&!value.startsWith('eq.')))return fail('Consulta no permitida.');
  }
  if(['PATCH','DELETE'].includes(request.method)&&!incoming.searchParams.has(table==='luden_budgets'?'category':'id'))return fail('Falta el registro que quieres modificar.');
  if(table==='luden_settings'&&(request.method==='POST'||request.method==='DELETE'))return fail('Operación no permitida.',403);
  const base=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!base||!key)return fail('Sincronización no disponible.',503);
  const target=new URL('/rest/v1/'+profileTable(table,await requireProfile()),base);target.search=incoming.search;
  const headers=new Headers({apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'});
  for(const name of ['accept','prefer','range','range-unit']){const value=request.headers.get(name);if(value)headers.set(name,value);}
  try{
    const body=['POST','PATCH'].includes(request.method)?await request.text():undefined;
    if(body&&body.length>1000000)return fail('Demasiados datos en una operación.',413);
    if(table==='luden_settings'&&body){
      const values=JSON.parse(body);
      if(!values||typeof values!=='object'||Array.isArray(values))return fail('Ajustes no válidos.');
      if(values.currency!==undefined&&values.currency!=='EUR')return fail('La divisa de la app es EUR.');
    }
    const result=await fetch(target,{method:request.method,headers,body,cache:'no-store'});
    const output=new Headers(noStore);
    for(const name of ['content-type','content-range','preference-applied']){const value=result.headers.get(name);if(value)output.set(name,value);}
    return new Response(result.status===204?null:await result.text(),{status:result.status,headers:output});
  }catch{return fail('No se pudo conectar con tus finanzas.',503);}
}
export {handle as GET,handle as POST,handle as PATCH,handle as DELETE};
