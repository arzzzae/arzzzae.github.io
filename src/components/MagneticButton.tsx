import { useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface MagneticButtonProps {
  children: ReactNode;
  href?: string;
  className?: string;
  /** How strongly the element is pulled toward the pointer (px at edge). */
  strength?: number;
  ariaLabel?: string;
}

/**
 * A button/link that is magnetically attracted to the pointer while hovered,
 * easing back to center on leave. Honors reduced-motion by simply not moving.
 */
export default function MagneticButton({
  children,
  href,
  className = '',
  strength = 24,
  ariaLabel,
}: MagneticButtonProps): React.JSX.Element {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);

  const { contextSafe } = useGSAP({ scope: ref });

  const onMove = contextSafe((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    gsap.to(el, {
      x: (relX / rect.width) * strength,
      y: (relY / rect.height) * strength,
      duration: 0.4,
      ease: 'power3.out',
    });
  });

  const onLeave = contextSafe(() => {
    if (!ref.current) return;
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  });

  const sharedProps = {
    ref,
    className: `magnetic ${className}`.trim(),
    onPointerMove: onMove,
    onPointerLeave: onLeave,
    'data-cursor': 'hover',
    'aria-label': ariaLabel,
  } as const;

  if (href) {
    return (
      <a {...sharedProps} href={href}>
        <span className="magnetic__inner">{children}</span>
      </a>
    );
  }

  return (
    <button {...sharedProps} type="button">
      <span className="magnetic__inner">{children}</span>
    </button>
  );
}
