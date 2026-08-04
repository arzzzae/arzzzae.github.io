import { z } from 'astro/zod';

/**
 * Zod schemas for the content collections, defined separately from
 * `content.config.ts` so they can be imported and unit-tested without the
 * Astro `astro:content` runtime.
 */

export const experienceSchema = z.object({
  role: z.string(),
  company: z.string(),
  location: z.string().optional(),
  start: z.string(),
  end: z.string().default('Present'),
  order: z.number(),
  highlights: z.array(z.string()).default([]),
  stack: z.array(z.string()).default([]),
});

export const industryGroupSchema = z.object({
  id: z.string(),
  company: z.string(),
  industries: z.array(z.string()).min(1),
  order: z.number(),
});

export const skillGroupSchema = z.object({
  id: z.string(),
  group: z.string(),
  weight: z.number().min(1).max(10).default(5),
  items: z.array(z.string()).min(1),
});

export const pinnedProjectSchema = z.object({
  id: z.string(),
  repo: z.string().optional(),
  name: z.string(),
  description: z.string(),
  url: z.string().url(),
  homepage: z.string().url().nullable().optional(),
  language: z.string().nullable().optional(),
  topics: z.array(z.string()).optional(),
  order: z.number().optional(),
});

export const testimonialSchema = z.object({
  author: z.string(),
  title: z.string().optional(),
  company: z.string().optional(),
  avatar: z.string().optional(),
  order: z.number().default(0),
});
