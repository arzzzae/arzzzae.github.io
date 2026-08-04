import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import {
  experienceSchema,
  industryGroupSchema,
  pinnedProjectSchema,
  skillGroupSchema,
  testimonialSchema,
} from './content/schemas';

const experience = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/experience' }),
  schema: experienceSchema,
});

const industries = defineCollection({
  loader: file('./src/content/industries/industries.json'),
  schema: industryGroupSchema,
});

const skills = defineCollection({
  loader: file('./src/content/skills/skills.json'),
  schema: skillGroupSchema,
});

const projects = defineCollection({
  loader: file('./src/content/projects/pinned.json'),
  schema: pinnedProjectSchema,
});

const testimonials = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/testimonials' }),
  schema: testimonialSchema,
});

export const collections = { experience, industries, skills, projects, testimonials };
