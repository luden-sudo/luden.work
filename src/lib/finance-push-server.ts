import type {ProfileId} from './profiles';
import { profileAdmin } from './day-server';
import { financeReminder, type ReminderDebt, type ReminderPayment } from './finance-reminders';

export async function readFinanceReminders(profile:ProfileId='luden') {
  const db=profileAdmin(profile);
  async function rows<T>(table:string,columns:string):Promise<T[]> {
    const result:T[]=[];
    for(let offset=0;;offset+=1000){
      const page=await db.from(table).select(columns).order('id').range(offset,offset+999);
      if(page.error)throw new Error('No se pudieron leer las deudas.');
      result.push(...page.data as unknown as T[]);
      if(page.data.length<1000)return result;
    }
  }
  const [debts,payments]=await Promise.all([
    rows<ReminderDebt>('luden_debts','id,person,title,direction,total,due_date,start_date'),
    rows<ReminderPayment>('luden_debt_payments','id,debt_id,amount'),
  ]);
  return {privateReminder:financeReminder(debts,payments,false,'EUR'),detailedReminder:financeReminder(debts,payments,true,'EUR')};
}
export async function readFinanceReminder(details:boolean,profile:ProfileId='luden'){const reminders=await readFinanceReminders(profile);return details?reminders.detailedReminder:reminders.privateReminder;}
