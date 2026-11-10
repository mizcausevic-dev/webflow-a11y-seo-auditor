// Demo harness only (not shipped in the extension bundle's entry): mock Designer + canvas renderer.
import { createMockWebflow, SAMPLE } from './lib/mock-webflow.js';
import { mountAuditor } from './lib/ui.js';

const webflow = createMockWebflow(structuredClone(SAMPLE));
const canvas = document.getElementById('canvas');

function node(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

async function textOf(e) {
  if (e.type === 'String') return (await e.getText()) ?? '';
  const parts = [];
  for (const k of e._kids) parts.push(await textOf(k));
  return parts.join('');
}

async function render(e) {
  const sel = webflow.state.selected === e ? ' sel' : '';
  if (e.type === 'Block') {
    const b = node('div', 'blk');
    for (const k of e._kids) b.append(await render(k));
    return b;
  }
  if (e.type === 'Heading') {
    const lvl = await e.getHeadingLevel();
    const d = node('div', `el h${lvl}${sel}`);
    d.append(node('span', 'tag', `H${lvl}`), document.createTextNode((await textOf(e)) || '(empty heading)'));
    return d;
  }
  if (e.type === 'Image') {
    const d = node('div', `el${sel}`);
    const alt = await e.getAltText();
    d.append(node('span', 'tag', 'IMG'), node('span', 'img'), node('span', 'tag', ` alt="${alt}"`));
    return d;
  }
  if (e.type === 'Link') {
    const d = node('div', `el${sel}`);
    const label = (await textOf(e)) || (await e.getCustomAttribute('aria-label') ? `[icon: ${await e.getCustomAttribute('aria-label')}]` : '(empty link)');
    d.append(node('span', 'tag', 'A'), node('span', 'lnk', label));
    return d;
  }
  const d = node('div', `el${sel}`);
  d.append(node('span', 'tag', e.type.toUpperCase().slice(0, 4)), document.createTextNode(await textOf(e)));
  return d;
}

async function paint() {
  const page = await webflow.getCurrentPage();
  const meta = node('div', 'meta', `/${await page.getSlug()} · <title>${await page.getTitle()}</title> · description: "${await page.getDescription()}"`);
  const blocks = [];
  for (const r of webflow.roots) blocks.push(await render(r));
  canvas.replaceChildren(meta, ...blocks);
  canvas.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
}

webflow.onChange(paint);
paint();
mountAuditor(document.getElementById('auditor'), webflow).run();
