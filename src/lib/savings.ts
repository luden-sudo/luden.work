import { accountChange, totalAmounts, cents } from './finance';
// Locale follows the page language (set by the server on <html lang>); Spanish elsewhere.
const locale=()=>typeof document!=="undefined"&&document.documentElement.lang==="en"?"en-GB":"es-ES";

export const SAVINGS_DEFAULT='__aurum_savings_default__';
export const SAVINGS_GOAL='__aurum_savings_goal__:';
export const SAVINGS_TEMPLATE='__aurum_savings_template__:';
export const SAVINGS_LOCATION='__aurum_savings_location__:';
export const SAVINGS_OPENING='__aurum_savings_opening__:';
export const SAVINGS_ALLOCATION='__aurum_savings_allocation__:';
export const SAVINGS_MOVE='__aurum_savings_move__:';
export const savingsLocations=['Efectivo','Banco','Cripto'] as const;
export type SavingsLocation=typeof savingsLocations[number];
export type SavingsAccount={id:string;name:string;kind:string;opening_balance:number};
export type SavingsEntry={id:string;type:'ingreso'|'gasto'|'traspaso';amount:number;account_id:string;destination_account_id?:string|null;date:string;savings_month?:string|null;title:string};
export type SavingsBudget={category:string;amount:number};
export type SavingsMove={from:string;to:string;amount:number;accountId?:string};
export function savingsAccountLabel(account:SavingsAccount,location:SavingsLocation){
  if(location==='Banco')return account.name.replace(/^Ahorro\s*(?:[·:–-]\s*)?/i,'').trim()||'Banco';
  return location==='Cripto'?'Cripto':'Efectivo';
}
export function savingsMove(category:string,amount:number):SavingsMove|null{
  if(!category.startsWith(SAVINGS_MOVE))return null;
  const [from,to,accountOrId,id]=category.slice(SAVINGS_MOVE.length).split(':');
  return validMonth(from)&&validMonth(to)&&from!==to&&Number(amount)>0?{from,to,amount:Number(amount),accountId:id?accountOrId:undefined}:null;
}
export function savingsMoveCategory(from:string,to:string,id:string,accountId?:string){
  if(!validMonth(from)||!validMonth(to)||from===to)throw new Error('Revisa los meses del traspaso.');
  return `${SAVINGS_MOVE}${from}:${to}:${accountId?accountId+':':''}${id}`;
}
export function savingsLocation(account:SavingsAccount,budgets:SavingsBudget[]):SavingsLocation{
  const code=Number(budgets.find(row=>row.category===SAVINGS_LOCATION+account.id)?.amount);
  if(Number.isInteger(code)&&code>=1&&code<=3)return savingsLocations[code-1];
  if(/efectivo|cash/i.test(account.name))return 'Efectivo';
  if(/cripto|crypto|bitcoin|btc|eth/i.test(account.name))return 'Cripto';
  return 'Banco';
}
export function savingsBreakdown(entries:SavingsEntry[],accounts:SavingsAccount[],budgets:SavingsBudget[]){
  return accounts.filter(account=>account.kind==='Ahorro').map(account=>({...account,location:savingsLocation(account,budgets),balance:totalAmounts([account.opening_balance,accountChange(entries,account.id)])}));
}
export const validMonth=(value:string)=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value);
export function shiftMonth(month:string,offset:number){const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+offset);return d.toISOString().slice(0,7);}
export function monthName(month:string){return new Date(month+'-01T12:00:00Z').toLocaleDateString(locale(),{month:'long',year:'numeric',timeZone:'Europe/Madrid'});}
export function savingsTarget(budgets:SavingsBudget[],month:string){
  const exact=budgets.find(row=>row.category===SAVINGS_GOAL+month);
  if(exact)return Number(exact.amount);
  const first=budgets.filter(row=>row.category.startsWith(SAVINGS_GOAL)).map(row=>row.category.slice(SAVINGS_GOAL.length)).filter(validMonth).sort()[0];
  if(first&&month<first)return 0;
  const template=budgets.filter(row=>row.category.startsWith(SAVINGS_TEMPLATE)&&validMonth(row.category.slice(SAVINGS_TEMPLATE.length))&&row.category.slice(SAVINGS_TEMPLATE.length)<=month).sort((a,b)=>b.category.localeCompare(a.category))[0];
  return Number(template?.amount??budgets.find(row=>row.category===SAVINGS_DEFAULT)?.amount??200);
}
export function savingsChange(entry:SavingsEntry,accounts:SavingsAccount[]){
  return totalAmounts(accounts.filter(account=>account.kind==='Ahorro').map(account=>accountChange([entry],account.id)));
}
export function monthlySavings(entries:SavingsEntry[],accounts:SavingsAccount[],month:string,budgets:SavingsBudget[]=[]){
  const accountsTotal=accounts.filter(account=>account.kind==='Ahorro').map(account=>monthlySavingsForAccount(entries,account,month,budgets));
  const legacyMoves=budgets.map(row=>savingsMove(row.category,row.amount)).filter((move):move is SavingsMove=>!!move&&!move.accountId).map(move=>move.from===month?-move.amount:move.to===month?move.amount:0);
  return totalAmounts([...accountsTotal,...legacyMoves]);
}
export function monthlySavingsForAccount(entries:SavingsEntry[],account:SavingsAccount,month:string,budgets:SavingsBudget[]=[]){
  if(account.kind!=='Ahorro')return 0;
  const allocationPrefix=SAVINGS_ALLOCATION+account.id+':'+month+':';
  const allocation=budgets.filter(row=>row.category.startsWith(allocationPrefix)).map(row=>row.category.slice(allocationPrefix.length)==='debit'?-Number(row.amount):Number(row.amount));
  const moves=budgets.map(row=>savingsMove(row.category,row.amount)).filter((move):move is SavingsMove=>!!move&&move.accountId===account.id).map(move=>move.from===month?-move.amount:move.to===month?move.amount:0);
  const activity=entries.filter(entry=>(entry.savings_month||entry.date.slice(0,7))===month).map(entry=>accountChange([entry],account.id));
  return totalAmounts([...allocation,...moves,...activity]);
}
export function savingsMonthlyBreakdown(entries:SavingsEntry[],accounts:SavingsAccount[],budgets:SavingsBudget[],month:string){
  return accounts.filter(account=>account.kind==='Ahorro').map(account=>({...account,location:savingsLocation(account,budgets),balance:monthlySavingsForAccount(entries,account,month,budgets)}));
}
export function savingsStatus(saved:number,target:number){
  return {remaining:Math.max(0,cents(target)-cents(saved))/100,percent:target>0?Math.max(0,Math.min(100,cents(saved)/cents(target)*100)):0,complete:target>0&&cents(saved)>=cents(target)};
}
export function savingsMonths(entries:SavingsEntry[],budgets:SavingsBudget[],current:string,selected:string){
  const moved=budgets.flatMap(row=>{const move=savingsMove(row.category,row.amount);return move?[move.from,move.to]:[]});
  const allocated=budgets.filter(row=>row.category.startsWith(SAVINGS_ALLOCATION)).map(row=>row.category.slice(SAVINGS_ALLOCATION.length).split(':')[1]).filter(validMonth);
  return [...new Set([current,selected,...Array.from({length:12},(_,i)=>shiftMonth(current,i)),...moved,...allocated,...budgets.filter(row=>row.category.startsWith(SAVINGS_GOAL)).map(row=>row.category.slice(SAVINGS_GOAL.length)).filter(validMonth),...entries.map(entry=>entry.savings_month).filter((month):month is string=>!!month&&validMonth(month))])].sort();
}
