import { useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface ScrollRevealProps {
  children: ReactNode;
  /** Direction the content travels in from. */
  from?: 'up' | 'down' | 'left' | 'right';
  /** Stagger children that carry the `data-reveal-item` attribute. */
  stagger?: boolean;
  className?: string;
  delay?: number;
}

const OFFSETS: Record<NonNullable<ScrollRevealProps['from']>, { x?: number; y?: number }> = {
  up: { y: 48 },
  down: { y: -48 },
  left: { x: 48 },
  right: { x: -48 },
};

/**
 * Reveals its content with a scroll-triggered fade/slide as it enters the
 * viewport. When `stagger` is set, immediate children marked with
 * `data-reveal-item` animate in sequence. Reduced-motion users see content
 * appear instantly.
 */
export default function ScrollReveal({
  children,
  from = 'up',
  stagger = false,
  className = '',
  delay = 0,
}: ScrollRevealProps): React.JSX.Element {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = container.current;
      if (!el) return;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set(stagger ? '[data-reveal-item]' : el, { autoAlpha: 1, x: 0, y: 0 });
        return;
      }

      const offset = OFFSETS[from];
      const targets = stagger ? el.querySelectorAll('[data-reveal-item]') : el;

      gsap.from(targets, {
        autoAlpha: 0,
        ...offset,
        duration: 0.8,
        ease: 'power3.out',
        delay,
        stagger: stagger ? 0.12 : 0,
        scrollTrigger: {
          trigger: el,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });
    },
    { scope: container },
  );

  return (
    <div ref={container} className={className}>
      {children}
    </div>
  );
}
