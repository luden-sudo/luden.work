"use client";
import { t, tv } from "@/lib/i18n";
import TimePicker from './time-picker';
import { useState } from 'react';
import { BookOpen, CalendarDays, Clock3, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { blocksFor, routineFor, shiftDay, validDay, type DayBlock, type DayChange, type DayOverride } from '@/lib/day-plan';
import { adjustmentError, changedRows, dayRows, schoolBlock, schoolChanges, type ChangeMode } from '@/lib/day-adjustments';

export default function DayChangesForm({today,onAdd,initialDay,initialMode,focus,blocks,changes:incomingChanges,busy,error,onSave,onCancel,onWeekly}:{today:string;onAdd:(day:string)=>void;initialDay:string;initialMode:ChangeMode;focus?:string;blocks:DayBlock[];changes:DayChange[];busy:boolean;error:string;onSave:(day:string,overrides:DayOverride[],revision:string|null)=>Promise<boolean>;onCancel:()=>void;onWeekly:(block:DayBlock)=>void}) {
  // Keep the draft and its revision together during background refreshes.
  const [changes]=useState(incomingChanges);
  const [day,setDay]=useState(initialDay);
  const [mode,setMode]=useState(initialMode);
  const [start,setStart]=useState('11:45');
  const [adaptMorning,setAdaptMorning]=useState(true);
  const [presetBase,setPresetBase]=useState(()=>dayRows(blocks,initialDay,changes));
  const [rows,setRows]=useState(()=>schoolChanges(blocks,initialDay,dayRows(blocks,initialDay,changes),initialMode,'11:45',true));
  const base=routineFor(blocks,day),school=schoolBlock(blocks,day);
  const overrides=changedRows(blocks,day,rows);
  const issue=!validDay(day)||day<today?'Elige una fecha desde hoy.':adjustmentError(blocks,day,overrides);
  const preview=issue?[]:blocksFor(blocks,day,[...changes.filter(change=>change.day!==day),{day,overrides,updated_at:''}]);
  const revision=changes.find(change=>change.day===day)?.updated_at||null;
  function chooseDate(value:string) {
    const baseRows=dayRows(blocks,value,changes);setDay(value);setPresetBase(baseRows);setRows(schoolChanges(blocks,value,baseRows,mode,start,adaptMorning));
  }
  function chooseMode(value:ChangeMode) {
    setMode(value);setRows(schoolChanges(blocks,day,presetBase,value,start,adaptMorning));
  }
  function patch(id:string,value:Partial<DayOverride>) {setRows(rows.map(row=>row.block_id===id?{...row,...value}:row));setPresetBase(presetBase.map(row=>row.block_id===id?{...row,...value}:row));}
  return <form className="day-change-form" onSubmit={event=>{event.preventDefault();if(!issue)onSave(day,overrides,revision);}}>
    <p className="day-plan-intro">{t("Los cambios se aplican solo a esta fecha. Tu rutina semanal sigue igual.")}</p>
    <div className="form-fields"><label className="full">{t("Día")}<input type="date" required min={today} value={day} onChange={e=>chooseDate(e.target.value)}/></label></div>
    <div className="day-plan-shortcuts"><button className="secondary" type="button" aria-pressed={day===today} onClick={()=>chooseDate(today)}>{t("Hoy")}</button><button className="secondary" type="button" aria-pressed={day===shiftDay(today,1)} onClick={()=>chooseDate(shiftDay(today,1))}>{t("Mañana")}</button></div>
    <div className="day-change-modes" role="group" aria-label={t("Tipo de cambio")}>{([{id:'late',label:t("Entro más tarde"),Icon:Clock3},{id:'no-class',label:t("No hay clase"),Icon:BookOpen},{id:'manual',label:t("A mi manera"),Icon:SlidersHorizontal}] as const).map(item=><button type="button" className="secondary" key={item.id} aria-pressed={mode===item.id} onClick={()=>chooseMode(item.id)}><item.Icon size={18}/>{tv(item.label)}</button>)}</div>
    {mode==='late'&&school&&<section className="day-change-preset"><h3>{tv(school.title)}</h3><TimePicker label={t("Hora de entrada")} required value={start} onChange={time=>{setStart(time);setRows(schoolChanges(blocks,day,presetBase,'late',time,adaptMorning));}}/><label className="day-toggle"><input type="checkbox" checked={adaptMorning} onChange={e=>{setAdaptMorning(e.target.checked);setRows(schoolChanges(blocks,day,presetBase,'late',start,e.target.checked));}}/><span>{t("Adaptar también la mañana")}<small>{t("Despertar, desayuno, preparación y salida mantienen sus tiempos.")}</small></span></label><p>{t("La hora de salir de clase se mantiene. Puedes cambiarla abajo.")}</p></section>}
    {mode==='no-class'&&school&&<p className="day-change-note">{t("Quitamos FP y los desplazamientos de este día. Puedes ajustar también el despertar o cualquier otra actividad.")}</p>}
    {mode!=='manual'&&!school&&<p className="day-change-note">{t("Este día no tiene clase en tu rutina. Puedes ajustar las actividades de abajo o añadir un plan.")}</p>}
    <p className="day-change-note">{t("Abre una actividad para cambiar su hora o nombre. Desmarca «Hacer este día» para quitarla.")}</p><section className="day-change-rows" aria-label={t("Actividades del día")}><h3>{t("Actividades de este día")}</h3><p>{t("Mueve las horas, cambia el nombre o quita lo que no vas a hacer.")}</p>{rows.map(row=>{
      const original=base.find(block=>block.id===row.block_id);
      if(!original)return null;
      return <details key={row.block_id} open={focus===row.block_id?true:undefined} className={row.skip?'day-change-skipped':''}><summary><span><strong>{tv(row.title)}</strong><small>{tv(row.skip?t("No se hace este día"):`${row.time}${row.end_time?' – '+row.end_time:''}`)}</small></span><SlidersHorizontal size={18}/></summary><div className="day-change-fields"><label className="day-toggle"><input type="checkbox" checked={!row.skip} onChange={e=>patch(row.block_id,{skip:!e.target.checked})}/><span>{t("Hacer este día")}</span></label>{!row.skip&&<div className="form-fields"><label className="full">{t("Nombre")}<input maxLength={100} required value={row.title} onChange={e=>patch(row.block_id,{title:e.target.value})}/></label><TimePicker label={t("Desde")} required value={row.time} onChange={time=>patch(row.block_id,{time})}/><TimePicker label={t("Hasta")} required={original.id!==base.at(-1)?.id} value={row.end_time||''} onChange={time=>patch(row.block_id,{end_time:time||null})}/></div>}</div></details>;
    })}{!rows.length&&<p>{t("Tu rutina está libre este día. Añade los planes que quieras desde «Cambiar mi día».")}</p>}</section>
    <button className="secondary day-add-inline" type="button" disabled={busy||!!issue} onClick={async()=>{if(await onSave(day,overrides,revision))onAdd(day);}}><CalendarDays size={18}/>{t("Guardar cambios y añadir una tarea")}</button>
    {issue&&<p className="form-error" role="alert">{tv(issue)}</p>}
    {!issue&&<section className="day-plan-preview" aria-label={t("Vista previa del día")}><h3><CalendarDays size={18}/>{t("Así queda tu día")}</h3><p>{tv(overrides.length?t("{0} actividades cambiadas solo para esta fecha.",{0:overrides.length}):t("Se usa tu rutina habitual."))}</p><details><summary>{t("Ver horario completo")}</summary><ol>{preview.flatMap((block,index)=>{
      const next=preview[index+1],end=block.end_time||next?.time;
      return [<li key={block.id+':'+block.time}><time>{tv(block.time)}{tv(end?'–'+end:'')}</time><span>{tv(block.title)}{tv(block.adjusted?t(" · cambiado"):'')}{tv(block.plan_date?t(" · plan"):'')}</span></li>,...(end&&next&&end<next.time?[<li className="day-preview-free" key={'free-'+block.id+block.time}><time>{tv(end)}–{tv(next.time)}</time><span>{t("Tiempo libre")}</span></li>]:[])];
    })}</ol></details></section>}
    {error&&<p className="form-error" role="alert">{tv(error)}</p>}
    <button className="text-button" type="button" disabled={busy} onClick={()=>{setMode('manual');setPresetBase(dayRows(blocks,day));setRows(dayRows(blocks,day));}}><RotateCcw size={17}/>{t("Restaurar rutina de este día")}</button>
    {focus&&<button className="text-button" type="button" disabled={busy} onClick={()=>{const block=blocks.find(item=>item.id===focus);if(block)onWeekly(block);}}>{t("Editar la rutina semanal")}</button>}
    <div className="dialog-actions"><button className="secondary" type="button" disabled={busy} onClick={onCancel}>{t("Cancelar")}</button><button className="primary" disabled={busy||!!issue}>{tv(busy?t("Guardando…"):t("Guardar este día"))}</button></div>
  </form>;
}
