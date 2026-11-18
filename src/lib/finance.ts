// Locale follows the page language (set by the server on <html lang>); Spanish elsewhere.
const locale=()=>typeof document!=="undefined"&&document.documentElement.lang==="en"?"en-GB":"es-ES";
const euroFormatter=new Intl.NumberFormat(locale(),{style:'currency',currency:'EUR'});
export const formatEuros=(amount:number)=>euroFormatter.format(amount);

/** All supported currencies and stored amounts use two decimal places. */
export function cents(value: number | string): number {
  return Math.round(Number(value) * 100);
}

export function totalAmounts(values: (number | string)[]): number {
  return values.reduce<number>((total, value) => total + cents(value), 0) / 100;
}

export function availableBalance(accounts:{kind:string;balance:number}[]):number {
  return totalAmounts(accounts.filter(account=>account.kind!=='Ahorro').map(account=>account.balance));
}

export function remainingDebt(total: number, payments: (number | string)[]) {
  const paid = totalAmounts(payments);
  return {
    paid,
    remaining: Math.max(0, cents(total) - cents(paid)) / 100,
    percent: cents(total) > 0 ? Math.min(100, cents(paid) / cents(total) * 100) : 0,
  };
}

type Movement = { type: 'gasto' | 'ingreso' | 'traspaso'; amount: number; account_id: string; destination_account_id?: string | null };
export function accountChange(entries: Movement[], accountId: string): number {
  return totalAmounts(entries.map(entry => {
    if (entry.type === 'traspaso') {
      return (entry.destination_account_id === accountId ? Number(entry.amount) : 0) - (entry.account_id === accountId ? Number(entry.amount) : 0);
    }
    return entry.account_id === accountId ? Number(entry.amount) * (entry.type === 'ingreso' ? 1 : -1) : 0;
  }));
}
