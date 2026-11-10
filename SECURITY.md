# Security Policy

Please report vulnerabilities through a [private security advisory](../../security/advisories/new).

## Behavior

- The extension runs inside the Webflow Designer's sandboxed iframe and talks to the site only through the Designer API.
- It makes no network requests and sends no site content anywhere.
- The only write it performs is `setHeadingLevel()`, and only when the user clicks "Fix level". Every change can be undone in the Designer.
- All content read from the page is rendered with `textContent`, never `innerHTML`.
