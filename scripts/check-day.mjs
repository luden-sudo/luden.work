import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('src/lib/day-plan.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ESNext}}).outputText;
const {blocksFor,dayKey,planState,zonedInstant,shiftDay}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
assert.equal(dayKey(new Date('2026-10-05T22:30:00Z')),'2026-10-06');
assert.equal(zonedInstant('2026-10-05','09:00'),'2026-10-05T07:00:00.000Z');
assert.equal(zonedInstant('2026-10-26','09:00'),'2026-10-26T08:00:00.000Z');
assert.equal(shiftDay('2026-12-31',1),'2027-01-01');
const blocks=[{id:'wake',title:'Wake',time:'08:00',weekdays:[0,1,2,3,4,5,6],kind:'rutina',description:'',remind:true},{id:'sleep',title:'Sleep',time:'23:00',weekdays:[0,1,2,3,4,5,6],kind:'noche',description:'',remind:true}];
const early=planState(blocks,new Date('2026-10-05T04:00:00Z'));
assert.equal(early.current.id,'sleep');assert.equal(early.current.day,'2026-10-04');assert.equal(early.next.id,'wake');assert.equal(early.remaining,120);
assert.equal(planState([],new Date()).current,null);
assert.equal(planState([],new Date()).next,null);
assert.equal(blocksFor([{...blocks[0],weekdays:[6]}],'2026-10-05').length,0);
console.log('PASS: Madrid timezone, DST offset, midnight, weekly recurrence, empty schedule and date rollover.');
const weekdayBlocks=blocks.map(b=>({...b,weekdays:[1,2,3,4,5]}));
for(const time of ['2026-10-10T00:00:00Z','2026-10-11T12:00:00Z']) {
  const free=planState(weekdayBlocks,new Date(time));
  assert.equal(free.current,null);assert.equal(free.next.day,'2026-10-12');assert.equal(free.next.id,'wake');assert.ok(free.remaining>0);
}
assert.equal(planState(weekdayBlocks,new Date('2026-10-09T21:30:00Z')).next.day,'2026-10-12');
const seed=JSON.parse(fs.readFileSync('scripts/day-seed.json','utf8'));
assert.equal(seed.length,20);
assert.ok(seed.every(b=>JSON.stringify(b.weekdays)==='[1,2,3,4,5]'));
assert.equal(planState(seed,new Date('2026-10-05T12:44:00Z')).current.title,'Instituto · FP');
assert.equal(planState(seed,new Date('2026-10-05T12:45:00Z')).current.title,'Volver a casa');
assert.equal(planState(seed,new Date('2026-10-05T21:45:00Z')).current.title,'Dormir');
console.log('PASS: personal weekday schedule, exact transitions and routine-free weekends.');

// Tasks without an end stay open, can be completed, and never carry into tomorrow.
const task={id:'task',title:'Recoger paquete',description:'',time:'09:00',plan_date:'2026-10-16',weekdays:[],kind:'compra',remind:true,end_time:null};
assert.equal(planState([task],new Date('2026-10-16T08:00:00Z')).current.id,'task');
assert.equal(planState([task],new Date('2026-10-16T08:00:00Z')).endsAt,null);
assert.equal(planState([task],new Date('2026-10-16T08:00:00Z'),[],[{block_id:'task',day:'2026-10-16'}]).current,null);
assert.equal(planState([task],new Date('2026-10-17T08:00:00Z')).current,null);
console.log('PASS: open-ended tasks, completion, no invented end and no next-day carry.');
