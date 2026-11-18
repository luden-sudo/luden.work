"use client";
import { t, tv, locale } from "@/lib/i18n";
import {useMemo} from 'react';
import ActivityIcon from './activity-icon';
import { Check, CheckCircle2, Play, Pencil, Plus } from 'lucide-react';
import { blocksFor, dayKey, minute, localMinute, planState, shiftDay, zonedInstant, type DayBlock, type Completion, type DayChange } from '@/lib/day-plan';

const duration=(minutes:number)=>minutes>=60?`${Math.floor(minutes/60)} h${minutes%60?` ${minutes%60} min`:''}`:`${minutes} min`;

export default function TodaySchedule({blocks,changes,done,now,busy,showCompleted,onToggleCompleted,onEdit,onStart,onComplete,onAdd}:{blocks:DayBlock[];changes:DayChange[];done:Completion[];now:Date;busy:boolean;showCompleted:boolean;onToggleCompleted:()=>void;onEdit:(block:DayBlock)=>void;onStart:(block:DayBlock)=>void;onComplete:(block:DayBlock,day:string,checked:boolean)=>void;onAdd:()=>void}) {
  const clock=now;
  const day=dayKey(clock);
  const {current,next,endsAt}=planState(blocks,clock,changes,done);
  const secondsLeft=endsAt?Math.max(0,Math.ceil((Date.parse(endsAt)-clock.getTime())/1000)):0;
  const hoursLeft=Math.floor(secondsLeft/3600),minutesLeft=Math.floor(secondsLeft%3600/60),remainingSeconds=secondsLeft%60;
  const list=useMemo(()=>blocksFor(blocks,day,changes),[blocks,day,changes]);
  const progress=current&&endsAt?Math.max(0,Math.min(100,(clock.getTime()-Date.parse(current.start))/(Date.parse(endsAt)-Date.parse(current.start))*100)):0;
  const endTime=(index:number)=>list[index]?.plan_date?list[index]?.end_time:list[index]?.end_time||list[index+1]?.time;
  const minutes=(index:number)=>endTime(index)?Math.max(0,minute(endTime(index)!)-minute(list[index].time)):null;
  const timeline=useMemo(()=>Array.from({length:8},(_,offset)=>{const key=shiftDay(day,offset);return blocksFor(blocks,key,changes).map(block=>({...block,day:key,start:zonedInstant(key,block.time)}));}).flat().sort((a,b)=>a.start.localeCompare(b.start)),[blocks,changes,day]);
  const upcoming=timeline.filter(block=>Date.parse(block.start)>clock.getTime()&&(!block.plan_date||!done.some(row=>row.block_id===block.id&&row.day===block.day))).slice(0,1);
  const nowMinute=localMinute(clock);
  return <div className="today-schedule">
    <section className={`today-now day-kind-${current?.kind||'rutina'}`} aria-label={t("Actividad actual")}>
      <div className="today-kicker"><strong>{tv(current?'AHORA':next?t("PRÓXIMA TAREA"):t("TU AGENDA"))}</strong><span>{tv(current?.time||next?.time||'—')}{tv(current?.end_time?` – ${current.end_time}`:next&&current&&!current.plan_date?` – ${next.time}`:'')}</span></div>
      <div className="today-countdown"><div className="today-ring" aria-hidden="true"><svg viewBox="0 0 104 104"><circle cx="52" cy="52" r="46" className="today-ring-track"/><circle cx="52" cy="52" r="46" className="today-ring-fill" key={current?.start} strokeDasharray="289.03" strokeDashoffset={289.03*(1-progress/100)}/></svg><span className="today-ring-icon"><ActivityIcon kind={(current||next)?.kind} size={34}/></span></div><div><span className="today-remaining-label">{tv(endsAt?t('QUEDAN'):current?.plan_date?t("EN CURSO"):current?t("POR HOY"):next?t('EMPIEZA A LAS {0}',{0:next.time}):t("TU DÍA"))}</span><div className="today-number" role="timer" aria-live="off" aria-label={tv(endsAt?t("{0} horas, {1} minutos y {2} segundos restantes",{0:hoursLeft,1:minutesLeft,2:remainingSeconds}):undefined)}>{tv(endsAt?<><span className="countdown-values" aria-hidden="true">{hoursLeft>0&&<span><CountdownNumber value={String(hoursLeft)}/><small>{t("h")}</small></span>}<span><CountdownNumber value={String(minutesLeft).padStart(2,'0')}/><small>{t("min")}</small></span><span><CountdownNumber value={String(remainingSeconds).padStart(2,'0')}/><small>{t("s")}</small></span></span></>:<small>{tv(current?.plan_date?t("Sin hora de fin"):current?t("Descansa"):next?(next.day===day?t("Hoy"):new Date(next.day+'T12:00:00Z').toLocaleDateString(locale(),{timeZone:'Europe/Madrid',weekday:'short',day:'numeric',month:'short'})):t("Sin tareas"))}</small>)}</div></div></div>
      <h2>{tv(current?.title||next?.title||t("Tu día está libre"))}</h2>
      {current&&<div className="today-current-actions"><button className="today-complete primary" disabled={busy} onClick={()=>onComplete(current,current.day,true)}><Check size={18}/>{t("Completar tarea")}</button><button className="today-complete secondary" disabled={busy} onClick={()=>onEdit(current)}>{t("Editar")}</button></div>}
      {!current&&next&&<div className="task-quick-actions">{next.plan_date&&<button className="task-quick-start" disabled={busy} onClick={()=>onStart(next)}><Play size={15}/>{t("Empezar ahora")}</button>}{next.day===day&&<button disabled={busy} onClick={()=>onComplete(next,next.day,true)}><Check size={16}/>{t("Terminar")}</button>}<button disabled={busy} onClick={()=>onEdit(next)}><Pencil size={15}/>{t("Editar")}</button></div>}
    </section>

    {current&&upcoming.length>0&&<section className="day-upcoming" aria-labelledby="upcoming-title"><h2 id="upcoming-title">{t("Lo siguiente")}</h2><div className="day-upcoming-grid">{upcoming.map(block=><article key={block.day+block.id+block.time} className="day-upcoming-item"><button className={"day-upcoming-card day-kind-"+block.kind} onClick={()=>onEdit(block)}><span className="day-upcoming-emoji" aria-hidden="true"><ActivityIcon kind={block.kind} size={20}/></span><small><time>{tv(block.time)}</time> · {tv(block.day===day?t("en {0}",{0:duration(Math.max(0,Math.ceil((Date.parse(block.start)-clock.getTime())/60000)))}):new Date(block.day+"T12:00:00Z").toLocaleDateString(locale(),{timeZone:"Europe/Madrid",weekday:"short"}))}</small><strong>{tv(block.title)}</strong></button><div className="task-quick-actions">{block.plan_date&&<button className="task-quick-start" disabled={busy} onClick={()=>onStart(block)}><Play size={15}/>{t("Empezar ahora")}</button>}{block.day===day&&<button disabled={busy} onClick={()=>onComplete(block,block.day,true)}><Check size={16}/>{t("Terminar")}</button>}</div></article>)}</div></section>}
    <section className="day-timeline" aria-labelledby="day-timeline-title"><header><h2 id="day-timeline-title">{t("Tus tareas de hoy")}</h2><button className="icon-button" aria-label={t("Añadir tarea")} onClick={onAdd}><Plus size={20}/></button></header>
      {done.some(item=>item.day===day)&&<button className="text-button completed-toggle" aria-pressed={showCompleted} onClick={onToggleCompleted}>{tv(showCompleted?t("Ocultar completadas"):t("Ver completadas"))}</button>}
      <div>{list.map((block,index)=>{
        const isNow=current?.day===day&&block.id===current.id&&block.time===current.time;
        const isDone=done.some(item=>item.block_id===block.id&&item.day===day),length=minutes(index);
        if(isDone&&!showCompleted)return null;
        if(!isDone&&(isNow||block.id===(current?upcoming[0]?.id:next?.id)&&day===(current?upcoming[0]?.day:next?.day)))return null;
        const past=!isNow&&minute(endTime(index)||block.time)<=nowMinute;
        return <article key={block.id+block.time} className={"day-timeline-row day-kind-"+block.kind+(isNow?" is-now":"")+(past?" is-past":"")+(isDone?" is-complete":"")}>
          <button className="day-timeline-main" onClick={()=>onEdit({...block,day})} aria-label={tv("Editar "+block.title)}>
            <time>{tv(block.time)}</time><span className="day-timeline-line" aria-hidden="true"/><span className="day-timeline-emoji" aria-hidden="true"><ActivityIcon kind={block.kind} size={18}/></span>
            <span className="day-timeline-copy"><strong>{tv(block.title)}</strong><small>{tv(isNow?t("Ahora")+(endsAt?t(" · quedan {0}",{0:duration(Math.ceil(secondsLeft/60))}):block.plan_date?t(" · sin hora de fin"):""):length!==null?duration(length):block.plan_date?(past&&!isDone?t("Pendiente · sin hora de fin"):t("Sin hora de fin")):t("Hasta el final del día"))}{tv(!isNow&&block.description?" · "+block.description:"")}{tv(block.resumed?t(" · Retomas"):"")}</small></span>
          </button>
          <button className={"icon-button day-timeline-check"+(isDone?" checked":"")} disabled={busy} aria-label={tv((isDone?"Marcar pendiente ":"Completar ")+block.title)} aria-pressed={isDone} onClick={()=>onComplete(block,day,!isDone)}>{tv(isDone?<CheckCircle2 size={18}/>:isNow?<Check size={18}/>:<Check size={18}/>)}</button>
        </article>;
      })}</div>
      {list.length>0&&!showCompleted&&list.every(block=>done.some(item=>item.block_id===block.id&&item.day===day))&&<p className="help">{t("Todo completado. Puedes ver tus tareas terminadas o añadir otra.")}</p>}
      {!list.length&&<div className="day-empty"><h3>{t("Tu día, a tu manera")}</h3><p>{tv(blocks.length?t("Hoy no tienes actividades. Puedes añadir una o disfrutar del día libre."):t("Añade lo que tengas que hacer, elige una hora y listo."))}</p><button className="primary" onClick={onAdd}><Plus size={18}/>{t("Añadir tarea")}</button></div>}
    </section>
  </div>;
}

function CountdownNumber({value}:{value:string}) {
  return <span className="countdown-digits">{Array.from(value,(digit,index)=><span className="countdown-digit-slot" key={index}><span className="countdown-digit" key={digit}>{tv(digit)}</span></span>)}</span>;
}
