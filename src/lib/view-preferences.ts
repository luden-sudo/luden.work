"use client";
import {useEffect, useState} from 'react';

export const viewDefaults={limits:true,project:true,savings:true,completed:true,balance:true,income:true,expenses:true,net:true,savingsTotal:true,recent:true,compact:false,recentCount:6};
const defaults=viewDefaults;
type ViewPreferences=typeof defaults;

/** Display choices are local to this profile and browser; financial data stays on the server. */
export function useViewPreferences(profile?:string) {
  const key=profile?'aurum-view-v1:'+profile:'';
  const [stored,setStored]=useState({key:'',value:defaults});
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>{
      const value={...defaults};
      try {
        const saved=JSON.parse(localStorage.getItem(key)||'{}');
        for(const field of Object.keys(defaults) as (keyof ViewPreferences)[]) {
          if(field==='recentCount'){if(typeof saved?.[field]==='number'&&[3,5,6,8].includes(saved[field]))value.recentCount=saved[field];}
          else if(typeof saved?.[field]==='boolean')value[field]=saved[field];
        }
      } catch { /* Defaults remain usable when browser storage is unavailable. */ }
      setStored({key,value});
    });
    return ()=>cancelAnimationFrame(frame);
  },[key]);
  const value=stored.key===key?stored.value:defaults;
  function update(next:ViewPreferences) {
    if(!key)return;
    setStored({key,value:next});
    try{localStorage.setItem(key,JSON.stringify(next));}catch{ /* Keep the in-memory choice. */ }
  }
  return [value,update] as const;
}
