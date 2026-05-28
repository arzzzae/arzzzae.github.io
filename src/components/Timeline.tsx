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
 * Self-drawing experience timeline: a vertical progress line "draws" itself as
 * the user scrolls through the section, while each entry fades/slides in.
 * Reduced-motion users see a fully drawn line and static entries.
 */
export default function Timeline({ entries }: TimelineProps): React.JSX.Element {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = container.current;
      if (!el) return;
      const line = el.querySelector<HTMLElement>('.timeline__progress');
      const items = el.querySelectorAll<HTMLElement>('.timeline__item');

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (line) gsap.set(line, { scaleY: 1 });
        gsap.set(items, { autoAlpha: 1, x: 0 });
        return;
      }

      if (line) {
        gsap.fromTo(
          line,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            transformOrigin: 'top center',
            scrollTrigger: {
              trigger: el,
              start: 'top 70%',
              end: 'bottom 80%',
              scrub: 0.6,
            },
          },
        );
      }

      items.forEach((item) => {
        gsap.from(item, {
          autoAlpha: 0,
          x: -40,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: item, start: 'top 85%' },
        });
      });
    },
    { scope: container },
  );

  return (
    <div ref={container} className="timeline">
      <div className="timeline__track" aria-hidden="true">
        <div className="timeline__progress" />
      </div>
      <ol className="timeline__list">
        {entries.map((entry) => (
          <li className="timeline__item" key={`${entry.company}-${entry.start}`}>
            <div className="timeline__node" aria-hidden="true" />
            <div className="timeline__content">
              <span className="timeline__period">
                {entry.start} — {entry.end}
              </span>
              <h3 className="timeline__role">{entry.role}</h3>
              <p className="timeline__company">
                {entry.company}
                {entry.location ? ` · ${entry.location}` : ''}
              </p>
              {entry.body && <p className="timeline__body">{entry.body}</p>}
              {entry.highlights.length > 0 && (
                <ul className="timeline__highlights">
                  {entry.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              )}
              {entry.stack.length > 0 && (
                <ul className="timeline__stack">
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
  );
}
