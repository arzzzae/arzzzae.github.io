import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Project } from '../lib/githubRepos';

gsap.registerPlugin(useGSAP);

interface ProjectCardProps {
  project: Project;
}

/**
 * A single project card with a 3D tilt/parallax effect that follows the pointer
 * and a glare highlight. Reduced-motion users get a static card.
 */
export default function ProjectCard({ project }: ProjectCardProps): React.JSX.Element {
  const cardRef = useRef<HTMLAnchorElement>(null);

  const { contextSafe } = useGSAP({ scope: cardRef });

  const onMove = contextSafe((e: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    gsap.to(el, {
      rotateY: (px - 0.5) * 16,
      rotateX: -(py - 0.5) * 16,
      duration: 0.4,
      ease: 'power2.out',
      transformPerspective: 800,
      transformOrigin: 'center',
    });
    el.style.setProperty('--glare-x', `${px * 100}%`);
    el.style.setProperty('--glare-y', `${py * 100}%`);
  });

  const onLeave = contextSafe(() => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'power3.out' });
  });

  return (
    <a
      ref={cardRef}
      className="project-card"
      href={project.url}
      target="_blank"
      rel="noreferrer noopener"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      data-cursor="hover"
      data-reveal-item
    >
      <div className="project-card__glare" aria-hidden="true" />
      <div className="project-card__body">
        <div className="project-card__header">
          <h3 className="project-card__name">{project.name}</h3>
          {project.featured && <span className="project-card__badge">Featured</span>}
        </div>
        <p className="project-card__desc">{project.description}</p>
        <div className="project-card__meta">
          {project.language && (
            <span className="project-card__lang">{project.language}</span>
          )}
          {project.stars > 0 && (
            <span className="project-card__stars">★ {project.stars}</span>
          )}
        </div>
        {project.topics.length > 0 && (
          <ul className="project-card__topics">
            {project.topics.slice(0, 4).map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        )}
      </div>
    </a>
  );
}
