import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Mounts Lenis smooth scrolling and wires it into the GSAP ticker so
 * ScrollTrigger stays in sync. Respects `prefers-reduced-motion`: when the user
 * prefers reduced motion we skip Lenis entirely and let the browser scroll
 * natively.
 *
 * Rendered once near the root as a `client:load` island. It renders nothing.
 */
export default function SmoothScroll(): null {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      autoRaf: false,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const update = (time: number): void => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return null;
}
