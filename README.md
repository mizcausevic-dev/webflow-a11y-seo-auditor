# A11y & SEO Auditor: a Webflow Designer Extension

[![CI](https://github.com/mizcausevic-dev/webflow-a11y-seo-auditor/actions/workflows/ci.yml/badge.svg)](https://github.com/mizcausevic-dev/webflow-a11y-seo-auditor/actions/workflows/ci.yml)
[![Pages](https://github.com/mizcausevic-dev/webflow-a11y-seo-auditor/actions/workflows/pages.yml/badge.svg)](https://mizcausevic-dev.github.io/webflow-a11y-seo-auditor/)
![Dependencies: 0](https://img.shields.io/badge/dependencies-0-5b8cff)
![License: MIT](https://img.shields.io/badge/license-MIT-8aa8ff)

**Live demo: https://mizcausevic-dev.github.io/webflow-a11y-seo-auditor/**. The extension runs against a simulated Designer that implements the same API methods, so you can click issues, select elements and fix headings.

A **Webflow Designer Extension** that audits the page open in the Designer for accessibility and SEO problems. You can jump to any flagged element on the canvas and fix heading levels with one click, without leaving the Designer.

## What it checks

| Rule | Severity | Catches |
|---|---|---|
| `H1-MISSING` / `H1-MULTIPLE` | error / warning | No H1, or more than one |
| `HEADING-SKIP` | warning | H2 → H4 jumps (one-click fix) |
| `HEADING-EMPTY` | error | Headings with no text |
| `IMG-ALT-MISSING` | warning | Images without alt text |
| `IMG-ALT-FILENAME` | error | Alt text like `logo-final-v2.png` or `IMG_1234` |
| `IMG-ALT-LONG` | note | Alt text over ~150 characters |
| `LINK-EMPTY` | error | Icon links with no text and no `aria-label` |
| `LINK-VAGUE` | warning | "Click here", "Read more", "Learn more →" |
| `LINK-NO-TARGET` | warning | Links with no destination set |
| `SEO-TITLE` / `SEO-DESCRIPTION` | warning | Missing, or outside ~30–60 / ~70–160 characters |
| `SEO-OG` | note | Missing Open Graph title or description |

## Designer API usage

Only methods declared in [`@webflow/designer-extension-typings`](https://www.npmjs.com/package/@webflow/designer-extension-typings) (v2.2.2) are used:

| Purpose | API |
|---|---|
| Walk the page | `webflow.getAllElements()`, `element.type`, `element.getChildren()` |
| Read content | `Heading.getHeadingLevel()`, `Image.getAltText()`, `Link.getTarget()`, `String.getText()`, `getCustomAttribute('aria-label')` |
| Page SEO | `webflow.getCurrentPage()` → `getTitle()`, `getDescription()`, `getOpenGraphTitle()`, `getOpenGraphDescription()`, `usesTitleAsOpenGraphTitle()`, `getSlug()` |
| Act | `webflow.setSelectedElement(el)`, `Heading.setHeadingLevel(n)`, `webflow.notify()`, `webflow.setExtensionSize('comfortable')` |

## Architecture

```
public/                      ← the extension (served by `webflow extension serve`, zipped by `bundle`)
  index.html, main.js        Designer entry: uses the global `webflow`
  lib/collect.js             adapter: Designer API → plain snapshot (the only file that knows the API)
  lib/audit.js               pure rules over the snapshot: unit-testable, no API access
  lib/ui.js                  panel UI (textContent only)
demo/                        ← never shipped in the extension bundle (a test enforces this)
  mock-webflow.js            API-shaped mock used by the tests and the demo
  demo.js                    demo harness: mock Designer + canvas renderer
webflow.json                 extension manifest (apiVersion 2, publicDir public)
```

Splitting **adapter / rules / UI** means the rules are tested without a Designer, and Designer API changes only affect one file.

## Run it in Webflow

```bash
npm i -g @webflow/webflow-cli
webflow extension serve      # localhost:1337
# In the Designer: Apps panel → your App → "Launch development App"
webflow extension bundle     # produces bundle.zip to upload to your App
```

You need a Webflow App registered in your Workspace with the Designer Extension capability turned on.

## Verification status

- **Tested:** 11 tests. They cover the adapter against the mock, linked images named by their alt text, a check that no demo or mock code ships in the extension bundle, a known-positive control (the sample page fires every rule it can), a known-negative control (a clean page scores 100 with zero issues), heading, link and alt rules, the one-click fix round-trip (`setHeadingLevel` → re-scan → issue gone), and manifest validity. A headless-browser smoke test of the demo covers scan → fix → select.
- **Not yet tested:** a run inside a live Webflow Designer. The mock follows the published type definitions, but real-Designer behavior (for example, element order from `getAllElements()` inside components) still needs to be confirmed.

## License

MIT © 2026 Mirza Causevic / Kinetic Gain LLC. Independent project, not affiliated with Webflow, Inc.
