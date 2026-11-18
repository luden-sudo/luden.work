"use client";
import {useCallback,useEffect,useRef,useState} from "react";

// Server UTC instant + monotonic elapsed time; never the device wall clock.
export function useServerClock() {
  const [now,setNow]=useState(()=>new Date(0));
  const [ready,setReady]=useState(false),[error,setError]=useState("");
  const anchor=useRef<{epoch:number;elapsed:number}|null>(null);
  const active=useRef(false),pending=useRef<AbortController|null>(null);
  const synchronize=useCallback(async()=>{
    if(pending.current)return;
    const controller=new AbortController();pending.current=controller;
    const timeout=setTimeout(()=>controller.abort(),10000);
    const start=performance.now();
    try{
      const response=await fetch("/api/time",{cache:"no-store",signal:controller.signal});
      if(!response.ok)throw new Error("No se pudo sincronizar la hora de Madrid.");
      const data=await response.json(),end=performance.now();
      if(!Number.isFinite(data.epochMs))throw new Error("Hora del servidor no válida.");
      if(!active.current)return;
      anchor.current={epoch:data.epochMs+(end-start)/2,elapsed:end};
      setNow(new Date(anchor.current.epoch));setReady(true);setError("");
    }catch{
      if(active.current)setError("No se pudo sincronizar la hora. Comprueba la conexión.");
    }finally{clearTimeout(timeout);if(pending.current===controller)pending.current=null;}
  },[]);
  useEffect(()=>{
    active.current=true;
    void synchronize();
    const tick=setInterval(()=>{
      if(anchor.current&&!document.hidden)setNow(new Date(anchor.current.epoch+performance.now()-anchor.current.elapsed));
    },1000);
    const sync=setInterval(()=>{if(!document.hidden)void synchronize();},60000);
    const resume=()=>{if(!document.hidden)void synchronize();};
    window.addEventListener("focus",resume);window.addEventListener("online",resume);document.addEventListener("visibilitychange",resume);
    return()=>{active.current=false;pending.current?.abort();pending.current=null;clearInterval(tick);clearInterval(sync);window.removeEventListener("focus",resume);window.removeEventListener("online",resume);document.removeEventListener("visibilitychange",resume);};
  },[synchronize]);
  return {now,ready,error,synchronize};
}
