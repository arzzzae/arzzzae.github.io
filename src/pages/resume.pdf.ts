import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import PDFDocument from 'pdfkit';
import { siteConfig } from '../config/site';

// Pre-rendered at build time, so the resume always reflects the current
// experience and skills content collections.
export const prerender = true;

const PAGE = { size: 'A4' as const, margin: 46 };
const CONTENT_W = 595.28 - PAGE.margin * 2;
const COLOR = { text: '#1a2236', dim: '#4a5670', accent: '#2f5dd6', rule: '#d4dcec' };

function streamToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
}

function sectionHeading(doc: PDFKit.PDFDocument, label: string): void {
  doc.moveDown(0.25);
  const y = doc.y;
  doc
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .fillColor(COLOR.accent)
    .text(label.toUpperCase(), PAGE.margin, y, { characterSpacing: 1 });
  doc
    .moveTo(PAGE.margin, doc.y + 1)
    .lineTo(PAGE.margin + CONTENT_W, doc.y + 1)
    .lineWidth(1.2)
    .strokeColor(COLOR.rule)
    .stroke();
  doc.moveDown(0.25);
}

function buildResume(
  experience: CollectionEntry<'experience'>[],
  skills: CollectionEntry<'skills'>[],
): Promise<Buffer> {
  const doc = new PDFDocument({ size: PAGE.size, margin: PAGE.margin, autoFirstPage: true });
  const done = streamToBuffer(doc);

  // --- Header ---
  doc.font('Helvetica-Bold').fontSize(24).fillColor(COLOR.text).text(siteConfig.name);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR.accent).text(siteConfig.role);
  const contact = [
    siteConfig.email,
    stripProtocol(siteConfig.social.linkedin),
    stripProtocol(siteConfig.social.github),
  ].join('   ·   ');
  doc.moveDown(0.3).font('Helvetica').fontSize(9.5).fillColor(COLOR.dim).text(contact);
  doc
    .moveTo(PAGE.margin, doc.y + 4)
    .lineTo(PAGE.margin + CONTENT_W, doc.y + 4)
    .lineWidth(1.6)
    .strokeColor(COLOR.accent)
    .stroke();
  doc.moveDown(0.4);

  // --- Summary ---
  sectionHeading(doc, 'Summary');
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(COLOR.text)
    .text(siteConfig.summary, { align: 'left', lineGap: 1 });

  // --- Experience ---
  sectionHeading(doc, 'Experience');
  experience.forEach((entry) => {
    const e = entry.data;
    const dates = `${e.start} — ${e.end}`;
    const rowY = doc.y;
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(COLOR.dim)
      .text(dates, PAGE.margin, rowY, { width: CONTENT_W, align: 'right' });
    doc
      .font('Helvetica-Bold')
      .fontSize(11.5)
      .fillColor(COLOR.text)
      .text(e.role, PAGE.margin, rowY, { width: CONTENT_W - 110, align: 'left' });
    const sub = [e.company, e.location].filter(Boolean).join(' · ');
    doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(COLOR.dim).text(sub);
    doc.moveDown(0.1);

    const bullets = e.highlights.length ? e.highlights : [entry.body?.trim()].filter(Boolean);
    if (bullets.length) {
      doc.font('Helvetica').fontSize(10).fillColor(COLOR.text).list(bullets as string[], {
        bulletRadius: 1.4,
        textIndent: 10,
        bulletIndent: 2,
        lineGap: 0.8,
      });
    }
    doc.moveDown(0.25);
  });

  // --- Skills ---
  sectionHeading(doc, 'Skills');
  skills.forEach((entry) => {
    const g = entry.data;
    const rowY = doc.y;
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COLOR.text)
      .text(g.group, PAGE.margin, rowY, { width: 110 });
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLOR.dim)
      .text(g.items.join('  ·  '), PAGE.margin + 114, rowY, { width: CONTENT_W - 114 });
    doc.moveDown(0.25);
  });

  doc.end();
  return done;
}

export const GET: APIRoute = async () => {
  const experience = (await getCollection('experience')).sort(
    (a: CollectionEntry<'experience'>, b: CollectionEntry<'experience'>) =>
      a.data.order - b.data.order,
  );
  const skills = (await getCollection('skills')).sort(
    (a: CollectionEntry<'skills'>, b: CollectionEntry<'skills'>) => b.data.weight - a.data.weight,
  );
  const pdf = await buildResume(experience, skills);

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="rosel-john-candoy-resume.pdf"',
    },
  });
};
