## Invox v2 — Developer Documentation

Purpose: concise, developer-focused reference for contributors who need to run, debug, and extend the Invox application.

---

## Quick overview

- Stack: Next.js (App Router) + React + TypeScript
- Database: MongoDB (via Mongoose)
- PDF generation: pdf-lib (server-side)
- Authentication: WebAuthn (FIDO2) for strong auth combined with JWT stored in an httpOnly cookie (`auth-token`).
- Location: single repository containing frontend pages (Next.js `app/`) and server API routes under `app/api/`.

## Quick start (local development)

1. Install dependencies

   PowerShell:

   ```powershell
   npm install
   ```

2. Create `.env.local` at project root and set the required environment variables (see section below).

3. Start dev server

   ```powershell
   npm run dev
   ```

4. Open http://localhost:3000 in your browser.

Notes:
- Use a running MongoDB instance (local or Atlas) and set `MONGODB_URI` accordingly.
- If you change env vars, restart the dev server.

## Important environment variables

Create `.env.local` with values similar to the example below. Adjust for your environment.

Example `.env.local`

```
MONGODB_URI=mongodb://localhost:27017/invox
JWT_SECRET=some-very-secret-value
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
PORT=3000
```

Key notes:
- `JWT_SECRET` must be identical for processes that sign/verify tokens.
- `WEBAUTHN_ORIGIN` and `WEBAUTHN_RP_ID` must match your host when testing WebAuthn (FIDO2). Use HTTPS in production.

## Project layout — key files and where to look

- app/
  - (auth)/login/page.tsx  — login UI (WebAuthn flows)
  - (auth)/register/page.tsx — registration UI (WebAuthn)
  - (dashboard)/... — protected UI pages
  - api/
    - auth/
      - register/route.ts — registration init/verify
      - login/route.ts — login init/verify, sets `auth-token` cookie
      - logout/route.ts — clears cookie
    - invoices/route.ts — list & create invoices
    - invoices/[id]/route.ts — invoice detail endpoints
    - invoices/[id]/sign/route.ts — WebAuthn invoice signing; generates PDF on success
    - pdf/[id]/route.ts — GET endpoint that serves the generated PDF file
    - test-pdf/route.ts — diagnostics to check PDF generation & filesystem

- components/ — UI primitives (shadcn-style components)
- utils/pdf.ts — Core PDF generation and filesystem helpers (generateInvoicePDF, savePDF, pdfExists, deletePDF)
- public/pdfs/taxInvoiceTemplate.ts — alternative invoice template (exports generateTaxInvoice). NOTE: currently unused by signing route.
- lib/webauthn.ts — server-side WebAuthn helpers (challenge generation + verification) used by auth and signing flows
- lib/db.ts — Mongoose connection helper
- models/ — Mongoose models: User, Invoice, Signature, Session, Setting, Log, etc.
- app/middleware.ts — Next.js middleware that protects routes and verifies `auth-token` cookie.

## How PDF generation works (short)

1. When an invoice is successfully signed (see `app/api/invoices/[id]/sign/route.ts`) the server calls `generateInvoicePDF(...)` and `savePDF(...)`.
   - The functions are defined in `utils/pdf.ts`.
   - `generateInvoicePDF` uses `pdf-lib` to render the PDF bytes.
   - `savePDF` writes the file to `public/pdfs` and returns a URL path like `/pdfs/<invoiceNumber>.pdf`.

2. The generated path is stored on the invoice document as `invoice.pdfUrl`.

3. To download or stream a PDF, the app exposes `app/api/pdf/[id]/route.ts` which reads `invoice.pdfUrl`, reads the file from disk (`public/<pdfUrl>`) and returns it as `Content-Type: application/pdf` with `Content-Disposition: attachment`.

Note about templates:
- There is a template `public/pdfs/taxInvoiceTemplate.ts` (exports `generateTaxInvoice`). The signing flow currently uses `utils/pdf.ts`'s `generateInvoicePDF`. If you want to swap or support multiple templates, update the sign route to call the desired template function (or add a template selector based on invoice type / company settings).

## Authentication & WebAuthn (how it's wired)

- WebAuthn flows (register & login) are implemented as two-step flows: init (generate challenge/options) and verify (attestation/assertion verification).
- Server helpers are in `lib/webauthn.ts` and use `@simplewebauthn/server` utilities.
- On successful login (assertion verify) the server signs a JWT and sets it in an httpOnly cookie named `auth-token`.
- Routes and middleware read `req.cookies.get('auth-token')` and verify using `JWT_SECRET`.

Security notes:
- Ensure cookies are set with `path: '/'`, `httpOnly: true`, `sameSite` and `secure: true` in production.
- For production, prefer short-lived access tokens + rotating refresh tokens stored hashed in the DB (not yet fully implemented). See TODOs at the end.

## Important APIs (developer quick reference)

- POST /api/auth/register — register (init/verify)
- POST /api/auth/login — login (init/verify). On verify success sets cookie `auth-token`.
- POST /api/auth/logout — clears `auth-token` cookie.
- GET /api/invoices — list invoices (protected)
- POST /api/invoices — create invoice (protected)
- GET /api/invoices/:id — invoice details (protected)
- POST /api/invoices/:id/sign — sign invoice (WebAuthn flow) — generates PDF on success
- GET /api/pdf/:id — download the generated PDF for invoice `id`

Client note when calling protected endpoints or download endpoints from the browser:
- Use fetch with credentials so the browser sends cookies:

```js
fetch(`/api/pdf/${invoiceId}`, { credentials: 'same-origin' })
```

If you are downloading the PDF from client-side code and want to save the file, convert the response to a blob and use an anchor to download.

## Troubleshooting quick wins

- Missing cookie on requests: ensure client fetch uses `credentials: 'same-origin'` (or `include` for cross-origin), and server sets cookie with `path: '/'`.
- JWT verify errors: ensure `JWT_SECRET` is set and identical where tokens are signed and verified.
- PDF 404: verify `invoice.pdfUrl` points to an existing file under `public/` and that `savePDF` wrote successfully to `public/pdfs`.
- WebAuthn failures: ensure `WEBAUTHN_ORIGIN` and `WEBAUTHN_RP_ID` match the origin in the browser and the host; WebAuthn requires secure origins (HTTPS) in production.

Use the following checks:
- Browser DevTools → Network: confirm request URL, response status, request cookies sent, and response headers.
- Server logs: many routes log actions (PDF generation, errors). Check console output of `npm run dev` for helpful messages.

## Tests & diagnostics

- There is a diagnostic endpoint at `app/api/test-pdf/route.ts` used by the diagnostics page to ensure PDF generation and filesystem access work. Use this if PDF generation seems to fail.

Recommended tests to add (not yet complete):
- Unit tests for `utils/pdf.ts` (generateInvoicePDF) using a small fixture invoice.
- Integration tests for WebAuthn flows using Playwright or Puppeteer (WebAuthn support in headless browsers is possible with emulated authenticators).

## Development workflow & tips

- Keep `MONGODB_URI` pointed at a disposable dev database.
- When altering auth, rotate `JWT_SECRET` carefully — any existing cookies will be invalidated.
- To preview generated PDFs without signing, you can call the diagnostic endpoint or write a small server-side script that calls `generateInvoicePDF` with a fixture invoice and writes the buffer to disk.

## Recommended immediate improvements (high priority)

1. Implement rotating refresh tokens with hashed storage in DB (improves session security). See `TODO` in project root.
2. Persist WebAuthn challenges in DB (instead of in-memory) so the app is robust across restarts and horizontally scalable.
3. Add rate limiting on auth endpoints to protect against brute-force/replay attempts.
4. Add E2E tests for auth, PDF generation and invoice signing flows.

## Where to change the invoice/PDF template

- Current generation function: `utils/pdf.ts` → `generateInvoicePDF`
- Alternative template file: `public/pdfs/taxInvoiceTemplate.ts` → `generateTaxInvoice`

To switch templates on signing, edit `app/api/invoices/[id]/sign/route.ts` where `generateInvoicePDF` is called and replace with the desired template function (or add a selector).

## Contact & context

If you need more details about a particular area, check the files listed in this document or ask for a targeted change (for example, "Add a preview endpoint that returns a generated PDF without signing").

---

Last updated: 2025-10-29
