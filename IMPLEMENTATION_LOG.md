# QR Studio implementation log

Append-only record of implementation decisions, changes, and verification. Entries are added as work progresses; earlier entries are retained.

## 2026-11-25 — Work started

- Read the full `Qr code.md` plan and confirmed the workspace has only the existing `Dockerfile` and `captain-definition` alongside the plan.
- The later UI review in the plan takes precedence where it conflicts with earlier requirements: preview density should respond to the entered URL, preset highlighting must include both colors, and the download action should remain clickable so validation can explain missing or invalid input.
- Planned a single Express service for the API and production static app, with Vite for development and a single npm workspace lockfile.

## 2026-11-25 — Application scaffold and first implementation

- Added the npm workspace, React/Vite client, Express URL-validation API, and focused Node test suite. The single workspace setup keeps dependency installation and the lockfile at the project root.
- Implemented live URL-aware QR previews, style and corner choices, color palettes and pickers, contrast warning/auto-fix, transparency, normalized center-logo upload, print sizes, and high-resolution PNG download.
- Reworked the existing Dockerfile into a production multi-stage build and fixed its malformed start command.
- Next: install workspace dependencies, run the production build and API tests, then fix any issues those checks uncover and append source-line evidence.

## 2026-11-25 — Initial checks and dependency update

- Installed the npm workspace dependencies and generated the single root `package-lock.json`.
- The first production build passed TypeScript and Vite; all 3 URL API tests passed. A live production-server smoke check returned the built page and a normalized URL response.
- The production-only dependency audit reported 0 vulnerabilities. The full audit identified development-server advisories in the initially resolved Vite release, so updated Vite to the patched 6.4.6 line and its compatible React plugin to 4.7.0 before final verification.
- Next: regenerate the lockfile, rerun build/tests/audits, check the page in a browser if available, then append final source line references and the working link.

## 2026-11-25 — Final verification and source proof

- Final `npm run build`: passed TypeScript and production Vite build with Vite 6.4.6.
- Final `npm test`: 3 passed, 0 failed; cases cover normalized valid links, empty input, and invalid/non-web URLs ([test/server.test.js:19](./test/server.test.js#L19), [test/server.test.js:34](./test/server.test.js#L34), [test/server.test.js:47](./test/server.test.js#L47)).
- Final `npm audit`: 0 vulnerabilities.
- Browser smoke check: the live preview rendered one QR canvas for `example.com/qr`, the Dots style selection updated, and invalid input displayed the expected helpful validation error. The export action completed and showed its success status; the integrated browser did not expose a native download event.
- Production link: [http://localhost:3000](http://localhost:3000) (served by the running local Express process; it is not publicly deployed).

### Implementation map

- URL-aware preview, fixed high error correction, logo-safe margins, and style updates: [client/src/App.tsx:111](./client/src/App.tsx#L111); high-resolution export/validation: [client/src/App.tsx:159](./client/src/App.tsx#L159) and [client/src/App.tsx:175](./client/src/App.tsx#L175).
- Contrast calculation/guardrail: [client/src/App.tsx:45](./client/src/App.tsx#L45); logo normalization and file validation: [client/src/App.tsx:59](./client/src/App.tsx#L59) and [client/src/App.tsx:135](./client/src/App.tsx#L135).
- Live URL display, two-color preset matching, and download control: [client/src/App.tsx:306](./client/src/App.tsx#L306), [client/src/App.tsx:400](./client/src/App.tsx#L400), and [client/src/App.tsx:419](./client/src/App.tsx#L419).
- URL normalization/API responses and same-origin static hosting: [server/index.js:10](./server/index.js#L10), [server/index.js:20](./server/index.js#L20), [server/index.js:55](./server/index.js#L55).
- Single-workspace dev/build/start/test scripts: [package.json:5](./package.json#L5); patched client build tools: [client/package.json:20](./client/package.json#L20); Vite API proxy and Express build output: [client/vite.config.ts:12](./client/vite.config.ts#L12) and [client/vite.config.ts:17](./client/vite.config.ts#L17).
- Multi-stage container build and production command: [Dockerfile:1](./Dockerfile#L1), [Dockerfile:12](./Dockerfile#L12), and [Dockerfile:23](./Dockerfile#L23).
