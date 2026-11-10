// Entry point inside the Webflow Designer: `webflow` is a global provided to Designer Extensions.
import { mountAuditor } from './lib/ui.js';

/* global webflow */
await webflow.setExtensionSize('comfortable');
mountAuditor(document.getElementById('auditor'), webflow).run();
