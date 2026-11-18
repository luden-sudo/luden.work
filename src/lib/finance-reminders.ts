import { dayKey, localMinute } from './day-plan';
import { remainingDebt } from './finance';

export type ReminderDebt = { id:string; person:string; title:string; direction:'me_deben'|'debo'; total:number; due_date:string|null; start_date:string };
export type ReminderPayment = { debt_id:string; amount:number };
export function financeReminderDue(now:Date,hour:number) {
  const minutes=localMinute(now);
  return Number.isInteger(hour)&&hour>=0&&hour<=23&&minutes>=hour*60&&minutes<hour*60+10;
}
export function financeReminder(debts:ReminderDebt[],payments:ReminderPayment[],details:boolean,currency='EUR') {
  const grouped=new Map<string,number[]>();
  for(const payment of payments){const amounts=grouped.get(payment.debt_id)||[];amounts.push(payment.amount);grouped.set(payment.debt_id,amounts);}
  const pending=debts.map(debt=>({...debt,remaining:remainingDebt(Number(debt.total),grouped.get(debt.id)||[]).remaining}))
    .filter(debt=>debt.remaining>0).sort((a,b)=>(a.due_date||'9999').localeCompare(b.due_date||'9999')||a.start_date.localeCompare(b.start_date)||a.id.localeCompare(b.id));
  if(!pending.length)return null;
  const first=pending[0];
  let formatted:string;
  try{formatted=new Intl.NumberFormat('es-ES',{style:'currency',currency}).format(first.remaining);}catch{formatted=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(first.remaining);}
  const person=first.person.trim().slice(0,60)||'Esta persona';
  return {
    title:details?(first.direction==='me_deben'?`${person} te debe ${formatted}`:`Debes ${formatted} a ${person}`):'Deudas pendientes',
    body:details?`${first.title.slice(0,90)}${pending.length>1?` · ${pending.length-1} más pendientes`:''}.`:`Tienes ${pending.length} ${pending.length===1?'deuda pendiente':'deudas pendientes'}. Abre Dinero para revisarlas.`,
    url:'/dinero?tab=deudas',
  };
}
export function financePayload(now:Date,debt:NonNullable<ReturnType<typeof financeReminder>>) {
  return {...debt,tag:'aurum-finance-'+dayKey(now)};
}
