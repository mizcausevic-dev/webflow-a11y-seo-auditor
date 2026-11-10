import test from 'node:test';
import assert from 'node:assert/strict';
import { collect, textOf, idKey } from '../public/lib/collect.js';
import { audit, RULES } from '../public/lib/audit.js';
import { createMockWebflow, SAMPLE } from '../public/lib/mock-webflow.js';
import { readFileSync } from 'node:fs';

const fresh = () => createMockWebflow(structuredClone(SAMPLE));
const rulesHit = (r) => new Set(r.issues.map((i) => i.rule));

test('collect reads headings, images, links and page SEO via Designer API methods', async () => {
  const wf = fresh();
  const snap = await collect(wf);
  assert.equal(snap.nodes.filter((x) => x.kind === 'heading').length, 6);
  assert.equal(snap.nodes.filter((x) => x.kind === 'image').length, 3);
  assert.equal(snap.nodes.filter((x) => x.kind === 'link').length, 7);
  assert.equal(snap.page.title, 'Pricing');
  const h1 = snap.nodes.find((x) => x.kind === 'heading');
  assert.equal(h1.text, 'Simple pricing for growing teams');
  assert.ok(snap.elementsByKey.get(h1.key), 'elements are addressable for selection');
});

test('known-positive control: the sample page triggers every rule except long-alt and missing-H1 (it has two H1s)', async () => {
  const r = audit(await collect(fresh()));
  const hit = rulesHit(r);
  for (const rule of Object.keys(RULES).filter((x) => !['IMG-ALT-LONG', 'H1-MISSING'].includes(x))) assert.ok(hit.has(rule), `${rule} did not fire`);
});

test('known-negative control: a clean page produces no issues', async () => {
  const wf = createMockWebflow({
    page: { slug: 'ok', title: 'Accessible pricing for growing product teams', description: 'Compare plans, see what each includes, and start a free 14-day trial with no credit card required.', ogUsesTitle: true, ogDescription: 'Compare plans and start free.' },
    tree: [
      { type: 'Heading', level: 1, children: ['Pricing'] },
      { type: 'Heading', level: 2, children: ['Plans'] },
      { type: 'Heading', level: 3, children: ['Starter'] },
      { type: 'Image', alt: 'Bar chart comparing plan limits' },
      { type: 'Link', href: '/plans/starter', children: ['Compare the Starter plan'] },
      { type: 'Link', href: 'https://x.com/e', children: [], attrs: { 'aria-label': 'Follow us on X' } },
    ],
  });
  const r = audit(await collect(wf));
  assert.deepEqual(r.issues, []);
  assert.equal(r.score, 100);
});

test('heading rules: skip, multiple H1, empty', () => {
  const snap = { page: { title: 'x'.repeat(40), description: 'y'.repeat(100), ogTitle: 'a', ogDescription: 'b' }, nodes: [
    { key: 'a', kind: 'heading', level: 1, text: 'A' },
    { key: 'b', kind: 'heading', level: 3, text: 'B' },
    { key: 'c', kind: 'heading', level: 1, text: 'C' },
    { key: 'd', kind: 'heading', level: 2, text: '' },
  ] };
  const r = audit(snap);
  assert.deepEqual(r.issues.map((i) => i.rule).sort(), ['H1-MULTIPLE', 'HEADING-EMPTY', 'HEADING-SKIP']);
  assert.equal(r.issues.find((i) => i.rule === 'HEADING-SKIP').key, 'b');
});

test('vague link detection ignores trailing arrows and punctuation', () => {
  const page = { title: 'x'.repeat(40), description: 'y'.repeat(100), ogTitle: 'a', ogDescription: 'b' };
  const r = audit({ page, nodes: [{ key: 'h', kind: 'heading', level: 1, text: 'T' }, { key: 'l', kind: 'link', text: 'Learn more →', target: '/x' }, { key: 'm', kind: 'link', text: 'Learn more about SSO', target: '/y' }] });
  assert.equal(r.issues.length, 1);
  assert.equal(r.issues[0].key, 'l');
});

test('fixing a heading through the Designer API clears the issue on re-scan', async () => {
  const wf = fresh();
  const snap = await collect(wf);
  const skip = audit(snap).issues.find((i) => i.rule === 'HEADING-SKIP');
  await snap.elementsByKey.get(skip.key).setHeadingLevel(3);
  const after = audit(await collect(wf));
  assert.ok(!after.issues.some((i) => i.key === skip.key && i.rule === 'HEADING-SKIP'));
});

test('missing H1 and long alt text', () => {
  const page = { title: 'x'.repeat(40), description: 'y'.repeat(100), ogTitle: 'a', ogDescription: 'b' };
  const r = audit({ page, nodes: [{ key: 'h', kind: 'heading', level: 2, text: 'Only H2' }, { key: 'i', kind: 'image', alt: 'a'.repeat(200) }] });
  assert.deepEqual(r.issues.map((i) => i.rule).sort(), ['H1-MISSING', 'IMG-ALT-LONG']);
});

test('helpers', async () => {
  assert.equal(idKey({ component: 'c', element: 'e' }), 'c:e');
  assert.equal(await textOf(null), '');
});

test('webflow.json is a valid Designer Extension manifest', () => {
  const m = JSON.parse(readFileSync(new URL('../webflow.json', import.meta.url)));
  assert.equal(m.apiVersion, '2');
  assert.equal(m.publicDir, 'public');
  assert.ok(['default', 'compact', 'comfortable', 'large'].includes(m.size));
});
