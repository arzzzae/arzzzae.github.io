import { useEffect, useRef } from 'react';

/**
 * A custom animated cursor: a small dot that tracks the pointer exactly and a
 * larger ring that eases toward it, growing when hovering interactive elements.
 *
 * Disabled (renders nothing) on touch devices and when the user prefers reduced
 * motion. Mounted once as a `client:load` island.
 */
export default function CustomCursor(): React.JSX.Element | null {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || prefersReduced) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.body.classList.add('has-custom-cursor');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let raf = 0;

    const onMove = (e: PointerEvent): void => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    };

    const isInteractive = (el: EventTarget | null): boolean =>
      el instanceof Element && Boolean(el.closest('a, button, [data-cursor="hover"]'));

    const onOver = (e: PointerEvent): void => {
      ring.classList.toggle('is-hovering', isInteractive(e.target));
    };

    const tick = (): void => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      cancelAnimationFrame(raf);
      document.body.classList.remove('has-custom-cursor');
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
