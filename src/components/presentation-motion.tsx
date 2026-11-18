"use client";
import { locale } from "@/lib/i18n";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';

// The accessible amount always contains the exact value; only its decorative copy counts.
export function AnimatedAmount({value,children}:{value:number;children:string}) {
 const root=useRef<HTMLSpanElement>(null),counter=useRef<HTMLSpanElement>(null),shown=useRef(0);
 useEffect(()=>{
  const element=root.current,display=counter.current;
  if(!element||!display)return;
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0;
  const finish=()=>{cancelAnimationFrame(frame);shown.current=value;display.textContent=children;element.classList.remove('is-counting');};
  if(preference.matches||!Number.isFinite(value)){finish();return;}
  const from=shown.current,start=performance.now();
  const format=new Intl.NumberFormat(locale(),{style:'currency',currency:'EUR'});
  element.classList.add('is-counting');
  const tick=(now:number)=>{
   const progress=Math.min(1,Math.max(0,(now-start)/420));
   shown.current=from+(value-from)*(1-(1-progress)**3);
   display.textContent=format.format(shown.current);
   if(progress<1)frame=requestAnimationFrame(tick);else finish();
  };
  preference.addEventListener('change',finish);
  frame=requestAnimationFrame(tick);
  return ()=>{cancelAnimationFrame(frame);preference.removeEventListener('change',finish);element.classList.remove('is-counting');};
 },[value,children]);
 return <span className="amount-motion" ref={root}><span className="amount-canonical">{children}</span><span className="amount-counter" aria-hidden="true" ref={counter}>{children}</span></span>;
}

// Exiting rows are inert snapshots. Persistence and deletion never wait for motion.
export function MotionRow({className,children}:{className:string;children:ReactNode}) {
 const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const element=ref.current;
  if(!element)return;
  return ()=>{
   if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden)return;
   const bounds=element.getBoundingClientRect();
   if(bounds.width===0||bounds.bottom<0||bounds.top>innerHeight)return;
   const copy=element.cloneNode(true) as HTMLElement;
   queueMicrotask(()=>{
    if(element.isConnected||!Element.prototype.animate)return;
    const ghost=document.createElement('div');
    ghost.className='app ui-row-ghost';ghost.inert=true;ghost.setAttribute('aria-hidden','true');
    Object.assign(ghost.style,{left:bounds.left+'px',top:bounds.top+'px',width:bounds.width+'px',height:bounds.height+'px'});
    // Clones must not duplicate IDs or participate in forms while they fade.
    copy.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));copy.removeAttribute('id');
    ghost.append(copy);document.body.append(ghost);
    const animation=ghost.animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(24px)'}],{duration:180,easing:'cubic-bezier(.25,.1,.25,1)'});
    void animation.finished.catch(()=>{}).finally(()=>ghost.remove());
   });
  };
 },[]);
 return <div ref={ref} className={className}>{children}</div>;
}
