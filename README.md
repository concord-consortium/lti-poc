# lti-poc

Proof-of-concept explorations for LTI 1.3 integration.

This POC uses the [`ltijs`](https://github.com/Cvmcosta/ltijs) library to create an LTI tool server with a few demo resources. It launches Activity Player activities (the original 2025 work) and CODAP v3 documents with per-student auto-save, a class roster, and gradebook status (the CODAP-1586 spike).

The main entry point is `server/index.ts`, which adds the API routes and then starts the LTI server.

## Initial setup

1. Clone this repo.
2. Run `npm ci` to install the dependencies.
3. Copy `.env.sample` to `.env` and fill it in (see [Configuration](#configuration) below). The server refuses to start if a required value is missing.
4. Create the Firebase config files (see [Firebase configs](#firebase-configs) below). The server refuses to start without them.
5. Run something like `ngrok` or `localtunnel` to get an https endpoint for port 3000 (e.g. `ngrok http 3000`) and set `PUBLIC_URL` in `.env` to that https URL. LTI requires the endpoints to be https.
6. Run `docker compose up` in one terminal window to start the MySQL instance used by the server.
7. Run `npm start` to start the server on port 3000.
8. Load http://localhost:3000 and the public https URL from step 5 to ensure the homepage loads.
9. Register the server with an LMS (see [Registering with an LMS](#registering-with-an-lms)).

**ngrok note:** free ngrok accounts get one permanent domain (claim it in the ngrok dashboard under Domains and start the tunnel with `ngrok http --url=<your-domain> 3000`). Without a fixed domain the URL changes every time you restart `ngrok`, and you must update `PUBLIC_URL` and re-register the tool in every LMS.

## Configuration

### `.env`

Required:

- `PUBLIC_URL`: the public https URL of this server (your tunnel), no trailing slash.
- `AP_BASE_URL`: the Activity Player to launch AP resources in.
- `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`: MySQL connection; the defaults in `.env.sample` match `docker-compose.yml`.
- `LOCAL_JWT_SECRET` and `LTI_KEY`: secrets the server makes up for itself (they sign the server's own tokens and `ltijs`'s cookies). Any random strings of 16+ characters, e.g. two runs of `openssl rand -hex 32`.

Optional: `LOG_REQUESTS` / `LOG_REQUESTS_PATH` (log every request and response to a file; useful for capturing launch tokens), `DYNAMIC_REGISTRATION_NAME` (the tool name shown to the LMS), `CODAP_URL` (which CODAP build to embed; default `https://codap.concord.org/app/`, the current production CODAP).

### Firebase configs

`server/firebase-configs/` must contain `report-service-dev.json`, `report-service-pro.json`, and `token-service.json`, each a Firebase service-account credential of the form `{"clientEmail": "...", "privateKey": "..."}`. The folder is gitignored. They are used only when launching Activity Player resources (the server signs Firebase tokens so AP can save to the report service). For LTI-only or CODAP-only testing, placeholder files with any non-empty values are enough:

```sh
mkdir -p server/firebase-configs
for f in report-service-dev report-service-pro token-service; do
  printf '{"clientEmail":"placeholder@example.com","privateKey":"placeholder"}\n' > server/firebase-configs/$f.json
done
```

The real files are available from the portal team / 1Password.

### Clients and resources

- `server/catalog/clients.ts` lists each LMS installation (its Client ID, platform, and which resource tags it may see). A launch from a Client ID that is not listed gets an empty resource picker. Add your own LMS's Client ID here when testing; don't commit local entries.
- `server/catalog/resources.ts` lists the resources the picker offers: Activity Player activities/sequences, internal demos (Token Debugger, Names and Roles Demo, Grading Demo), and the CODAP resources.

## Registering with an LMS

### Canvas (dynamic registration)

As a Canvas admin: Admin → Developer Keys → "+ Developer Key" → "+ LTI Registration", paste `<PUBLIC_URL>/register`, finish the registration, and turn the key On. Then Admin → Apps → the new app → set availability to **Available** (new registrations start as "Not Available"). Copy the Client ID into `clients.ts` and restart. The tool then appears under Modules → "+" → External Tool and under Assignments → External Tool → Find.

Notes:

- The registration declares `link_selection` and `assignment_selection` placements with a Deep Linking message. Canvas only offers the placements a tool declares, and without the Deep Linking message it creates plain-link placements that never open the picker.
- A free Canvas Lite / Free-for-Teacher account has no admin access and cannot register LTI 1.3 tools. For development, run the open-source [`canvas-lms`](https://github.com/instructure/canvas-lms) in Docker (`./script/docker_dev_setup.sh`), which makes you the site admin.
- A local Canvas is plain `http`, so open it in **Firefox**: Chrome's Local Network Access check blocks the OIDC redirect from the public tunnel back to `canvas.docker`.

### Schoology (manual app)

Schoology has no dynamic registration. As a Schoology system administrator: App Center → My Developer Apps → Add App. Set the domain to your tunnel host, OIDC login URL `<PUBLIC_URL>/login`, redirect URL `<PUBLIC_URL>/launch`, and the JWKS URL shown on the server homepage; enable Deep Linking, Assignment and Grade Services, and Names and Roles; choose the Course Materials placement; keep "Available for: Only people in my school". From the app's profile page, "Install LTI 1.3 App" into the organization, then App Center → Organization Apps → Install into courses. Copy the Client ID (Options → API Info → "LTI 1.3 App") into `clients.ts` with `platform: "schoology"` and restart: the server registers Schoology platforms itself at startup from that list.

Notes:

- Schoology lowercases custom parameter names; the server only uses lowercase names.
- A graded material ("Enable Grading") only gets a gradebook column if it has a graded Category and a Grading Period.
- Concord's dev account and its Client IDs are in 1Password ("Schoology Dev Account").

### Moodle

Site administration → Plugins → External tools → Manage tools, enter `<PUBLIC_URL>/register` and add. See the June 2025 "Portal LTI Integration" doc for the step-by-step.

## CODAP resources

A `codap` resource launches a host page (`server/public/codap-host.html`) that embeds CODAP v3 with `?interactiveApi` and drives it over the LARA interactive API (`iframe-phone`): the page sends CODAP the document to open, receives CODAP's state on every autosave and stores it, and answers CODAP's requests for upload/download URLs for large documents. Students get their own auto-saved copy of the source document; teachers get the class roster (Names and Roles), open student copies read-only, and see who has marked the item done. "Mark as done" posts `Completed` / `PendingManual` with no score to the LMS gradebook (graded items only), and the teacher grades in the LMS.

Two resources are provided: **CODAP Demo (Mammals)** (a small sample document in `server/public/codap/`) and **Custom CODAP document** (the teacher pastes a CODAP share link or a document URL in the picker).

Data lives under `server/data/codap/` (gitignored): student documents and attachments, a per-assignment student index, and assignment records. Scores are not stored (the gradebook is the only copy); rosters are fetched live. This is a prototype store; production would use S3 and a small table.

Prototype caveats: `ltijs` runs in `devMode` (session carried in the `ltik` query token); `/codap/*` request bodies are read raw (capped at 20 MB) ahead of `ltijs`'s 100 KB body parsers so documents get through; failed saves are not retried. The server strips `helmet`'s `Cross-Origin-Embedder-Policy` header, which otherwise blocks embedding CODAP in any https LMS.

## Debugging

The `ltijs` library uses the [`debug`](https://www.npmjs.com/package/debug) npm module for logging. That module allows developers to namespace console logs so that output is controlled by a `DEBUG` environment variable. To see all debug statements run `export DEBUG=*` in the terminal window before running `npm start`. To see specific module output search for [`debug`](https://github.com/search?q=repo%3ACvmcosta%2Fltijs%20debug&type=code) in the GitHub repo and use the module names you see there (e.g. `export DEBUG=provider:auth` or `export DEBUG=provider:gradeService`).

To capture what an LMS sends on launch, set `LOG_REQUESTS=true` in `.env` and read `LOG_REQUESTS_PATH`, or add the **Token Debugger** resource to a course: it prints the decoded launch token.
