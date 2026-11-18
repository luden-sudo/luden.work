"use client";
import { useEffect } from 'react';

/** Fades sections in as they scroll into view. Content stays visible without JavaScript or with reduced motion. */
export default function Reveal() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    root.classList.add('reveal-ready');
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
    return () => { observer.disconnect(); root.classList.remove('reveal-ready'); };
  }, []);
  return null;
}
