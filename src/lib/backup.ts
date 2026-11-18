import {profileTable,type ProfileId} from './profiles';

// Explicit business-data allowlist. Never export credentials or device tokens.
export const backupTables=[
  {key:'accounts',table:'luden_accounts',order:['id']},
  {key:'entries',table:'luden_transactions',order:['id']},
  {key:'prefs',table:'luden_settings',order:['id']},
  {key:'budgets',table:'luden_budgets',order:['category']},
  {key:'debts',table:'luden_debts',order:['id']},
  {key:'debtPayments',table:'luden_debt_payments',order:['id']},
  {key:'blocks',table:'luden_day_blocks',order:['id']},
  {key:'done',table:'luden_day_done',order:['day','block_id']},
  {key:'changes',table:'luden_day_changes',order:['day']},
  {key:'items',table:'aurum_management_items',order:['id']},
  {key:'events',table:'aurum_management_events',order:['id']},
] as const;
export type BackupTable=typeof backupTables[number];
export type BackupPage={rows:Record<string,unknown>[];count:number};
export async function buildBackup(profile:ProfileId,readPage:(table:string,order:readonly string[],offset:number,limit:number,owner?:ProfileId)=>Promise<BackupPage>,displayName:string=profile){
  const sections=await Promise.all(backupTables.map(async definition=>{
    const shared=definition.table.startsWith('aurum_');
    const table=shared?definition.table:profileTable(definition.table,profile);
    const rows:Record<string,unknown>[]=[];
    let expected:number|undefined;
    for(let offset=0;;offset+=500){
      const page=await readPage(table,definition.order,offset,500,shared?profile:undefined);
      expected??=page.count;
      if(page.count!==expected)throw new Error('Los datos cambiaron durante la copia. Vuelve a intentarlo.');
      rows.push(...page.rows);
      if(page.rows.length<500)break;
    }
    if(rows.length!==expected)throw new Error('No se pudo completar la copia. Vuelve a intentarlo.');
    return [definition.key,rows] as const;
  }));
  const all=Object.fromEntries(sections);
  return {
    app:'aurum',schema_version:1,profile:{id:profile,name:displayName},exported_at:new Date().toISOString(),currency:'EUR',
    finance:{accounts:all.accounts,entries:all.entries,prefs:all.prefs.map(p=>({...p,currency:'EUR'})),budgets:all.budgets,debts:all.debts,debtPayments:all.debtPayments},
    day:{blocks:all.blocks,done:all.done,changes:all.changes},
    management:{items:all.items,events:all.events},
    counts:Object.fromEntries(sections.map(([key,rows])=>[key,rows.length])),
    excluded:['PIN y claves de acceso','Suscripciones y permisos de dispositivos'],
  };
}
