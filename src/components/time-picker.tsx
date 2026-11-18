"use client";

import { t, tv, locale } from "@/lib/i18n";
import {useId,useLayoutEffect,useRef,useState} from 'react';
import {ChevronDown,Clock3} from 'lucide-react';

const twoDigits=(value:number)=>String(value).padStart(2,'0');

function TimeWheel({label,count,value,onChange}:{label:string;count:number;value:number;onChange:(value:number)=>void}) {
 const id=useId(),wheel=useRef<HTMLDivElement>(null),initial=useRef(value);
 const typed=useRef({digits:'',at:0});
 const clamp=(value:number)=>Math.max(0,Math.min(count-1,value));
 function rowHeight(){return wheel.current?.firstElementChild?.getBoundingClientRect().height||44;}
 useLayoutEffect(()=>{const element=wheel.current;if(element)element.scrollTop=initial.current*(element.firstElementChild?.getBoundingClientRect().height||44);},[]);
 function select(next:number){
  next=clamp(next);onChange(next);wheel.current?.scrollTo({top:next*rowHeight(),behavior:'instant'});
 }
 return <div className="time-wheel" ref={wheel} role="listbox" tabIndex={0} aria-label={tv(label)} aria-activedescendant={`${id}-${value}`}
  onPointerDown={()=>wheel.current?.focus({preventScroll:true})}
  onScroll={event=>onChange(clamp(Math.round(event.currentTarget.scrollTop/rowHeight())))}
  onKeyDown={event=>{
   const steps:Record<string,number>={ArrowUp:value-1,ArrowDown:value+1,Home:0,End:count-1,PageUp:value-5,PageDown:value+5};
   if(event.key in steps){event.preventDefault();typed.current.digits='';select(steps[event.key]);}
   else if(/^\d$/.test(event.key)){
    event.preventDefault();const now=event.timeStamp;let digits=now-typed.current.at<700?typed.current.digits+event.key:event.key;
    if(digits.length>2||Number(digits)>=count)digits=event.key;
    typed.current={digits,at:now};select(Number(digits));
   }
  }}>
  {Array.from({length:count},(_,index)=><div key={index} id={`${id}-${index}`} className="time-wheel-value" role="option" aria-selected={value===index} onClick={()=>select(index)}>{twoDigits(index)}</div>)}
 </div>;
}

export default function TimePicker({label,value,required=false,onChange}:{label:string;value:string;required?:boolean;onChange:(value:string)=>void}) {
 const id=useId(),trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(value||'00:00');
 const [hours,minutes]=draft.split(':').map(Number);
 function show(){setDraft(value||'00:00');setOpen(true);}
 function close(){setOpen(false);trigger.current?.focus();}
 return <div className="time-picker-field" onBlur={event=>{if(open&&!event.currentTarget.contains(event.relatedTarget)){onChange(draft);setOpen(false);}}} onKeyDown={event=>{if(open&&(event.key==='Escape'||event.key==='Enter')){event.preventDefault();event.stopPropagation();if(event.key==='Enter')onChange(draft);close();}}}>
  <label id={`${id}-label`} htmlFor={`${id}-trigger`}>{tv(label)}</label>
  <input className="time-picker-native" type="time" value={value} required={required} tabIndex={-1} aria-hidden="true" aria-label={tv(label)}
   onChange={event=>onChange(event.target.value)} onInvalid={event=>{event.preventDefault();show();trigger.current?.focus();}}/>
  <button id={`${id}-trigger`} ref={trigger} type="button" className="time-picker-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={open?`${id}-panel`:undefined} onClick={()=>open?close():show()}>
   <Clock3 size={20} aria-hidden="true"/><span id={`${id}-value`}>{tv(open?draft:value||t("Elegir hora"))}</span><ChevronDown size={17} aria-hidden="true"/>
  </button>
  {open&&<section id={`${id}-panel`} className="time-picker-panel" aria-label={t("Elegir {0}",{0:label.toLocaleLowerCase(locale())})}>
   <div className="time-picker-toolbar"><span>{tv(label)}</span>{!required&&value&&<button type="button" onClick={()=>{onChange('');close();}}>{t("Quitar hora")}</button>}<button type="button" onClick={()=>{onChange(draft);close();}}>{t("Listo")}</button></div>
   <div className="time-wheel-labels" aria-hidden="true"><span>{t("Horas")}</span><span>{t("Minutos")}</span></div>
   <div className="time-wheel-columns">
    <TimeWheel label={t("Horas")} count={24} value={hours} onChange={hour=>setDraft(`${twoDigits(hour)}:${twoDigits(minutes)}`)}/>
    <span className="time-wheel-colon" aria-hidden="true">:</span>
    <TimeWheel label={t("Minutos")} count={60} value={minutes} onChange={minute=>setDraft(`${twoDigits(hours)}:${twoDigits(minute)}`)}/>
   </div>
  </section>}
 </div>;
}
