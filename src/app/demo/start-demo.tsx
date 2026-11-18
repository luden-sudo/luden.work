"use client";
import { useEffect } from 'react';
import { startDemo } from '@/lib/demo';

export default function StartDemo() {
  useEffect(() => { startDemo(); window.location.replace('/hoy'); }, []);
  return <main className="skeleton-screen" aria-busy="true"/>;
}
