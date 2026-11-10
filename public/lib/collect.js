// Adapter: Webflow Designer API -> plain, serializable snapshot.
// Only methods declared in @webflow/designer-extension-typings are used:
//   webflow.getAllElements(), webflow.getCurrentPage(), element.type, element.id,
//   Heading.getHeadingLevel(), Image.getAltText(), Link.getTarget(), children.getChildren(),
//   String.getText(), CustomAttributes.getCustomAttribute(), Page.getTitle()/getDescription()/
//   getOpenGraphTitle()/getOpenGraphDescription()/usesTitleAsOpenGraphTitle()/getSlug().

export const idKey = (id) => (id && typeof id === 'object' ? `${id.component}:${id.element}` : String(id));

/**
 * Accessible-name text of an element: String descendants plus the alt text of nested images
 * (a linked logo is named by its alt). Bounded depth.
 */
export async function textOf(el, depth = 0) {
  if (!el || depth > 6) return '';
  if (el.type === 'String' && typeof el.getText === 'function') return (await el.getText()) ?? '';
  if (el.type === 'Image' && typeof el.getAltText === 'function') return ` ${(await el.getAltText()) ?? ''} `;
  if (!el.children || typeof el.getChildren !== 'function') return '';
  const kids = await el.getChildren();
  const parts = [];
  for (const k of kids) parts.push(await textOf(k, depth + 1));
  return parts.join('').replace(/\s+/g, ' ').trim();
}

async function attr(el, name) {
  if (el.customAttributes && typeof el.getCustomAttribute === 'function') {
    try { return await el.getCustomAttribute(name); } catch { return null; }
  }
  return null;
}

function describeTarget(t) {
  if (t === null || t === undefined) return null;
  if (typeof t === 'string') return t;
  return '[page/element/asset link]';
}

/**
 * @param {object} webflow  the Designer API global
 * @returns {Promise<{ page, nodes, elementsByKey }>}
 */
export async function collect(webflow, { limit = 3000 } = {}) {
  const all = (await webflow.getAllElements()).slice(0, limit);
  const nodes = [];
  const elementsByKey = new Map();
  for (const el of all) {
    const key = idKey(el.id);
    elementsByKey.set(key, el);
    if (el.type === 'Heading') {
      nodes.push({ key, kind: 'heading', level: await el.getHeadingLevel(), text: await textOf(el) });
    } else if (el.type === 'Image') {
      nodes.push({ key, kind: 'image', alt: (await el.getAltText()) ?? '' });
    } else if (el.type === 'Link') {
      nodes.push({ key, kind: 'link', text: await textOf(el), ariaLabel: await attr(el, 'aria-label'), target: describeTarget(await el.getTarget()) });
    }
  }
  const p = await webflow.getCurrentPage();
  const page = {
    slug: await p.getSlug(),
    title: await p.getTitle(),
    description: await p.getDescription(),
    ogTitle: (await p.usesTitleAsOpenGraphTitle()) ? await p.getTitle() : await p.getOpenGraphTitle(),
    ogDescription: await p.getOpenGraphDescription(),
  };
  return { page, nodes, elementsByKey, scanned: all.length };
}
