// Pure audit rules over a snapshot. No Designer API access here, which keeps it fully unit-testable.

const VAGUE = new Set(['click here', 'here', 'read more', 'learn more', 'more', 'link', 'this', 'this link', 'go', 'details', 'continue', 'click']);
const FILENAME = /(\.(png|jpe?g|gif|webp|svg|avif)$)|^(img|image|dsc|photo|screenshot)[-_ ]?\d+/i;

export const RULES = {
  'H1-MISSING': { severity: 'error', fix: 'Add exactly one H1 that states the page topic.' },
  'H1-MULTIPLE': { severity: 'warning', fix: 'Keep one H1; demote the others to H2.' },
  'HEADING-SKIP': { severity: 'warning', fix: 'Do not skip levels (e.g. H2 → H4); screen-reader users navigate by heading level.' },
  'HEADING-EMPTY': { severity: 'error', fix: 'Give the heading text or remove it.' },
  'IMG-ALT-MISSING': { severity: 'warning', fix: 'Describe the image in the alt text, or mark it decorative in the image settings if it adds no information.' },
  'IMG-ALT-FILENAME': { severity: 'error', fix: 'Replace the file name with a description of what the image shows.' },
  'IMG-ALT-LONG': { severity: 'note', fix: 'Keep alt text under ~150 characters; move detail into a caption.' },
  'LINK-EMPTY': { severity: 'error', fix: 'Add visible link text, or an aria-label for icon-only links.' },
  'LINK-VAGUE': { severity: 'warning', fix: 'Say where the link goes ("Read the pricing guide"), not "click here".' },
  'LINK-NO-TARGET': { severity: 'warning', fix: 'Set a destination for the link.' },
  'SEO-TITLE': { severity: 'warning', fix: 'Write a unique title of roughly 30–60 characters.' },
  'SEO-DESCRIPTION': { severity: 'warning', fix: 'Write a meta description of roughly 70–160 characters.' },
  'SEO-OG': { severity: 'note', fix: 'Set Open Graph title and description for link previews.' },
};

export function audit({ page, nodes }) {
  const issues = [];
  const add = (rule, message, key = null) => issues.push({ rule, severity: RULES[rule].severity, message, key, fix: RULES[rule].fix });

  const headings = nodes.filter((n) => n.kind === 'heading' && n.level);
  const h1s = headings.filter((h) => h.level === 1);
  if (h1s.length === 0) add('H1-MISSING', 'This page has no H1.');
  h1s.slice(1).forEach((h) => add('H1-MULTIPLE', `Extra H1: "${h.text || '(empty)'}"`, h.key));
  let prev = 0;
  for (const h of headings) {
    if (!h.text) add('HEADING-EMPTY', `Empty H${h.level}.`, h.key);
    if (prev && h.level > prev + 1) add('HEADING-SKIP', `H${prev} is followed by H${h.level} ("${h.text}").`, h.key);
    prev = h.level;
  }

  for (const img of nodes.filter((n) => n.kind === 'image')) {
    const alt = (img.alt ?? '').trim();
    if (!alt) add('IMG-ALT-MISSING', 'Image has no alt text.', img.key);
    else if (FILENAME.test(alt)) add('IMG-ALT-FILENAME', `Alt text looks like a file name: "${alt}"`, img.key);
    else if (alt.length > 150) add('IMG-ALT-LONG', `Alt text is ${alt.length} characters.`, img.key);
  }

  for (const link of nodes.filter((n) => n.kind === 'link')) {
    const label = (link.ariaLabel || link.text || '').trim();
    if (!label) add('LINK-EMPTY', 'Link has no text or aria-label.', link.key);
    else if (VAGUE.has(label.toLowerCase().replace(/[.!→»>›]+$/g, '').trim())) add('LINK-VAGUE', `Vague link text: "${label}"`, link.key);
    if (!link.target) add('LINK-NO-TARGET', `Link "${label || '(empty)'}" has no destination.`, link.key);
  }

  const t = (page.title ?? '').trim();
  if (!t) add('SEO-TITLE', 'Page title is empty.');
  else if (t.length < 30 || t.length > 60) add('SEO-TITLE', `Title is ${t.length} characters: "${t}"`);
  const d = (page.description ?? '').trim();
  if (!d) add('SEO-DESCRIPTION', 'Meta description is empty.');
  else if (d.length < 70 || d.length > 160) add('SEO-DESCRIPTION', `Meta description is ${d.length} characters.`);
  if (!(page.ogTitle ?? '').trim() || !(page.ogDescription ?? '').trim()) add('SEO-OG', 'Open Graph title or description is missing.');

  const weight = { error: 10, warning: 4, note: 1 };
  const score = Math.max(0, 100 - issues.reduce((s, i) => s + weight[i.severity], 0));
  const order = { error: 0, warning: 1, note: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);
  return { issues, score, counts: { error: issues.filter((i) => i.severity === 'error').length, warning: issues.filter((i) => i.severity === 'warning').length, note: issues.filter((i) => i.severity === 'note').length } };
}
