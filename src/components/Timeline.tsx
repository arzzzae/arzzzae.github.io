import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export interface TimelineEntry {
  role: string;
  company: string;
  location?: string;
  start: string;
  end: string;
  highlights: string[];
  stack: string[];
  body: string;
}

interface TimelineProps {
  entries: TimelineEntry[];
}

/**
 * Pinned experience showcase: the section pins to the viewport and each job is
 * revealed one at a time as the user scrolls, with the outgoing role sliding up
 * and out while the incoming role slides up from below. Scroll position snaps to
 * each role so a single job always fills the stage — no inner scrollbar.
 *
 * When the user prefers reduced motion (or there is only a single entry) the
 * component falls back to a plain, statically stacked list with everything
 * visible and no pinning.
 */
export default function Timeline({ entries }: TimelineProps): React.JSX.Element {
  const container = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = container.current;
      const pinEl = pin.current;
      if (!root || !pinEl) return;

      const panels = gsap.utils.toArray<HTMLElement>('.expshow__panel', root);
      const dots = gsap.utils.toArray<HTMLElement>('.expshow__dot', root);
      const fill = root.querySelector<HTMLElement>('.expshow__fill');

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Static fallback: stacked, fully visible, no pin.
      if (prefersReduced || panels.length < 2) {
        root.classList.add('expshow--static');
        gsap.set(panels, { autoAlpha: 1, yPercent: 0 });
        dots.forEach((d) => d.classList.add('is-active'));
        if (fill) gsap.set(fill, { scaleY: 1 });
        return;
      }

      const setActive = (index: number): void => {
        dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
      };

      gsap.set(panels, { autoAlpha: 0, yPercent: 100 });
      gsap.set(panels[0], { autoAlpha: 1, yPercent: 0 });
      setActive(0);

      const steps = panels.length - 1;
      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut', duration: 1 },
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: () => '+=' + steps * window.innerHeight,
          pin: pinEl,
          scrub: true,
          snap: { snapTo: 1 / steps, duration: 0.25, ease: 'power1.inOut' },
          onUpdate: (self) => {
            setActive(Math.round(self.progress * steps));
          },
        },
      });

      if (fill) {
        tl.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: 'none', duration: steps }, 0);
      }

      for (let i = 1; i < panels.length; i += 1) {
        tl.to(panels[i - 1], { autoAlpha: 0, yPercent: -100 }, i - 1).to(
          panels[i],
          { autoAlpha: 1, yPercent: 0 },
          i - 1,
        );
      }
    },
    { scope: container },
  );

  return (
    <div ref={container} className={`expshow${entries.length < 2 ? ' expshow--static' : ''}`}>
      <div ref={pin} className="expshow__pin">
        <div className="expshow__rail" aria-hidden="true">
          <span className="expshow__track">
            <span className="expshow__fill" />
          </span>
          {entries.map((entry) => (
            <span className="expshow__dot" key={`dot-${entry.company}-${entry.start}`} />
          ))}
        </div>
        <ol className="expshow__panels">
          {entries.map((entry, i) => (
            <li className="expshow__panel" key={`${entry.company}-${entry.start}`}>
              <div className="expshow__content">
                <span className="expshow__index">
                  {String(i + 1).padStart(2, '0')} / {String(entries.length).padStart(2, '0')}
                </span>
                <span className="expshow__period">
                  {entry.start} — {entry.end}
                </span>
                <h3 className="expshow__role">{entry.role}</h3>
                <p className="expshow__company">
                  {entry.company}
                  {entry.location ? ` · ${entry.location}` : ''}
                </p>
                {entry.body && <p className="expshow__body">{entry.body}</p>}
                {entry.highlights.length > 0 && (
                  <ul className="expshow__highlights">
                    {entry.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                )}
                {entry.stack.length > 0 && (
                  <ul className="expshow__stack">
                    {entry.stack.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
