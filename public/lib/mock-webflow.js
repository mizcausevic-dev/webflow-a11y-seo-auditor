// A faithful-in-shape mock of the parts of the Webflow Designer API this extension uses.
// Used by the unit tests and the public demo page. Method names and return shapes follow
// @webflow/designer-extension-typings 2.x.

let n = 0;
function makeElement(spec, listeners) {
  const id = { component: 'page', element: `el-${++n}` };
  const kids = (spec.children ?? []).map((c) => (typeof c === 'string' ? makeElement({ type: 'String', text: c }, listeners) : makeElement(c, listeners)));
  const attrs = new Map(Object.entries(spec.attrs ?? {}));
  const el = {
    id,
    type: spec.type,
    children: spec.type !== 'Image' && spec.type !== 'String',
    customAttributes: spec.type !== 'String',
    _spec: spec,
    async getChildren() { return kids; },
    async getCustomAttribute(name) { return attrs.get(name) ?? null; },
    async setCustomAttribute(name, value) { attrs.set(name, value); listeners.forEach((f) => f()); return null; },
  };
  if (spec.type === 'String') el.getText = async () => spec.text ?? null;
  if (spec.type === 'Heading') {
    el.getHeadingLevel = async () => spec.level ?? 1;
    el.setHeadingLevel = async (level) => {
      if (![1, 2, 3, 4, 5, 6].includes(level)) throw new Error('invalid heading level');
      spec.level = level; listeners.forEach((f) => f()); return null;
    };
  }
  if (spec.type === 'Image') {
    el.getAltText = async () => spec.alt ?? '';
    el.setAltText = async (alt) => { spec.alt = alt ?? ''; listeners.forEach((f) => f()); return null; };
  }
  if (spec.type === 'Link') el.getTarget = async () => spec.href ?? null;
  el._kids = kids;
  return el;
}

export function createMockWebflow({ page, tree }) {
  const listeners = new Set();
  const roots = tree.map((t) => makeElement(t, listeners));
  const flat = [];
  const walk = (e) => { flat.push(e); e._kids.forEach(walk); };
  roots.forEach(walk);
  const state = { selected: null, notifications: [], size: 'default' };
  const pageObj = {
    getSlug: async () => page.slug,
    getTitle: async () => page.title,
    getDescription: async () => page.description,
    usesTitleAsOpenGraphTitle: async () => Boolean(page.ogUsesTitle),
    getOpenGraphTitle: async () => page.ogTitle ?? '',
    getOpenGraphDescription: async () => page.ogDescription ?? '',
  };
  return {
    roots,
    state,
    onChange(f) { listeners.add(f); },
    async getAllElements() { return flat; },
    async getCurrentPage() { return pageObj; },
    async setSelectedElement(el) { state.selected = el; listeners.forEach((f) => f()); return el; },
    async getSelectedElement() { return state.selected; },
    notify(opts) { state.notifications.push(opts); },
    async setExtensionSize(size) { state.size = size; return null; },
  };
}

/** Sample landing page with realistic problems. */
export const SAMPLE = {
  page: { slug: 'pricing', title: 'Pricing', description: '', ogTitle: '', ogDescription: '' },
  tree: [
    { type: 'Block', children: [
      { type: 'Image', alt: 'logo-final-v2.png' },
      { type: 'Link', href: '/', children: [] , attrs: {} },
      { type: 'Link', href: '/features', children: ['Features'] },
      { type: 'Link', href: '/customers', children: ['Customers'] },
    ] },
    { type: 'Block', children: [
      { type: 'Heading', level: 1, children: ['Simple pricing for growing teams'] },
      { type: 'Paragraph', children: ['Start free, upgrade when you need more seats.'] },
      { type: 'Image', alt: '' },
      { type: 'Link', href: '/signup', children: ['Start your free trial'] },
    ] },
    { type: 'Block', children: [
      { type: 'Heading', level: 2, children: ['Plans'] },
      { type: 'Heading', level: 4, children: ['Starter'] },
      { type: 'Link', href: '/plans/starter', children: ['Read more'] },
      { type: 'Heading', level: 4, children: ['Business'] },
      { type: 'Link', href: null, children: ['Click here'] },
    ] },
    { type: 'Block', children: [
      { type: 'Heading', level: 1, children: ['Frequently asked questions'] },
      { type: 'Heading', level: 3, children: [] },
      { type: 'Image', alt: 'Two colleagues reviewing an invoice dashboard on a laptop' },
      { type: 'Link', href: 'https://twitter.com/example', children: [], attrs: { 'aria-label': 'Follow us on X' } },
    ] },
  ],
};
