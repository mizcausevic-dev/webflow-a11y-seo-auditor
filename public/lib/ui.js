// Extension panel UI. Runs inside the Webflow Designer iframe (global `webflow`) or on the demo page (mock).
import { collect } from './collect.js';
import { audit } from './audit.js';

function el(tag, attrs = {}, text) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text !== undefined) n.textContent = text;
  return n;
}
const SEV = { error: 'danger', warning: 'warn', note: 'info' };

export function mountAuditor(root, webflow) {
  let snapshot = null;

  async function fixHeading(issue) {
    const node = snapshot.nodes.find((n) => n.key === issue.key);
    const idx = snapshot.nodes.filter((n) => n.kind === 'heading').indexOf(node);
    const prevLevel = snapshot.nodes.filter((n) => n.kind === 'heading')[idx - 1]?.level ?? 1;
    const target = issue.rule === 'H1-MULTIPLE' ? 2 : Math.min(6, prevLevel + 1);
    await snapshot.elementsByKey.get(issue.key).setHeadingLevel(target);
    webflow.notify({ type: 'Success', message: `Changed heading to H${target}` });
    await run();
  }

  async function run() {
    root.replaceChildren(el('p', { class: 'hint' }, 'Scanning page…'));
    try {
      snapshot = await collect(webflow);
    } catch (e) {
      root.replaceChildren(el('p', { class: 'error-box' }, `Could not read the page: ${e.message}`));
      return;
    }
    const result = audit(snapshot);
    const head = el('div', { class: 'panel-head' });
    const left = el('div');
    left.append(el('h2', {}, `/${snapshot.page.slug}`), el('div', { class: 'hint' }, `${snapshot.scanned} elements scanned`));
    const score = el('div', { class: `score ${result.score >= 85 ? 'good' : result.score >= 60 ? 'mid' : 'bad'}`, 'aria-label': `Score ${result.score} out of 100` }, String(result.score));
    head.append(left, score);
    const counts = el('div', { class: 'counts' });
    for (const s of ['error', 'warning', 'note']) counts.append(el('span', { class: `pill ${SEV[s]}` }, `${result.counts[s]} ${s}${result.counts[s] === 1 ? '' : 's'}`));
    const rescan = el('button', { type: 'button', class: 'ghost' }, 'Re-scan');
    rescan.addEventListener('click', run);
    const list = el('div', { role: 'list' });
    if (!result.issues.length) list.append(el('div', { class: 'empty' }, 'No issues found on this page.'));
    for (const issue of result.issues) {
      const item = el('div', { class: 'issue', role: 'listitem' });
      const top = el('div');
      top.append(el('span', { class: `pill ${SEV[issue.severity]}` }, issue.rule), document.createTextNode(` ${issue.message}`));
      item.append(top, el('p', { class: 'fix' }, issue.fix));
      const actions = el('div', { class: 'actions' });
      if (issue.key) {
        const b = el('button', { type: 'button', class: 'ghost' }, 'Select on canvas');
        b.addEventListener('click', () => webflow.setSelectedElement(snapshot.elementsByKey.get(issue.key)));
        actions.append(b);
      }
      if (issue.key && (issue.rule === 'HEADING-SKIP' || issue.rule === 'H1-MULTIPLE')) {
        const f = el('button', { type: 'button' }, 'Fix level');
        f.addEventListener('click', () => fixHeading(issue));
        actions.append(f);
      }
      if (actions.childNodes.length) item.append(actions);
      list.append(item);
    }
    root.replaceChildren(head, counts, rescan, el('div', { class: 'mt-8' }), list);
    webflow.notify({ type: result.counts.error ? 'Warning' : 'Success', message: `Audit: ${result.counts.error} errors, ${result.counts.warning} warnings` });
  }

  return { run };
}
