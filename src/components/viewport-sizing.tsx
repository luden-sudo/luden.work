"use client";
import {useEffect} from 'react';
import {fieldScrollDelta,keyboardIsOpen} from '@/lib/mobile-viewport';

/** Keep the active field and sheet inside Safari's visible area. */
export default function ViewportSizing(){
  useEffect(()=>{
    const candidate=window.visualViewport;
    if(!candidate)return;
    const viewport=candidate;
    const root=document.documentElement,body=document.body;
    let frame=0,referenceHeight=window.innerHeight,lastWidth=viewport.width;
    let locked:false|{y:number;position:string;top:string;width:string;overflow:string}=false;
    function syncModal(){
      const open=Boolean(document.querySelector('dialog[open]'));
      if(open&&!locked){
        locked={y:window.scrollY,position:body.style.position,top:body.style.top,width:body.style.width,overflow:body.style.overflow};
        body.style.position='fixed';body.style.top=-locked.y+'px';body.style.width='100%';body.style.overflow='hidden';
      }else if(!open&&locked){
        const saved=locked;locked=false;
        body.style.position=saved.position;body.style.top=saved.top;body.style.width=saved.width;body.style.overflow=saved.overflow;
        window.scrollTo({top:saved.y,behavior:'instant'});
      }
    }
    function update(){
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        if(viewport.scale!==1)return;
        const focused=document.activeElement;
        const editing=focused instanceof HTMLTextAreaElement&&!focused.readOnly||focused instanceof HTMLInputElement&&!focused.readOnly&&!['checkbox','radio','button','submit'].includes(focused.type)||focused instanceof HTMLSelectElement;
        if(Math.abs(viewport.width-lastWidth)>40){referenceHeight=window.innerHeight;lastWidth=viewport.width;}
        if(!editing&&viewport.height>referenceHeight-100)referenceHeight=window.innerHeight;
        const keyboard=keyboardIsOpen(window.innerHeight,viewport.height,referenceHeight,editing);
        root.style.setProperty('--app-viewport-height',viewport.height+'px');
        root.style.setProperty('--app-viewport-top',viewport.offsetTop+'px');
        root.dataset.keyboard=keyboard?'open':'closed';
        if(editing&&focused instanceof HTMLElement){
          const dialog=focused.closest('dialog');
          if(dialog){
            const header=dialog.querySelector(':scope>header')?.getBoundingClientRect();
            const footer=dialog.querySelector('.dialog-actions,.mg-form>footer')?.getBoundingClientRect();
            const top=Math.max(viewport.offsetTop+12,header?header.bottom+12:0);
            const bottom=Math.min(viewport.offsetTop+viewport.height-12,footer&&footer.top>top?footer.top-12:Infinity);
            const delta=fieldScrollDelta(focused.getBoundingClientRect(),top,bottom);
            if(delta)dialog.scrollBy({top:delta,behavior:'instant'});
          }
        }
      });
    }
    const observer=new MutationObserver(()=>{syncModal();});
    observer.observe(body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
    syncModal();update();
    viewport.addEventListener('resize',update);viewport.addEventListener('scroll',update);
    document.addEventListener('focusin',update);document.addEventListener('focusout',update);
    return()=>{
      cancelAnimationFrame(frame);observer.disconnect();viewport.removeEventListener('resize',update);viewport.removeEventListener('scroll',update);
      document.removeEventListener('focusin',update);document.removeEventListener('focusout',update);
      if(locked){body.style.position=locked.position;body.style.top=locked.top;body.style.width=locked.width;body.style.overflow=locked.overflow;window.scrollTo({top:locked.y,behavior:'instant'});}
      delete root.dataset.keyboard;root.style.removeProperty('--app-viewport-height');root.style.removeProperty('--app-viewport-top');
    };
  },[]);
  return null;
}
