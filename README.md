# Singapore Tech Events

A weekly digest of technology meetups and conferences in Singapore — AI,
software engineering, frontend, backend, cloud and data.

**Read it here: https://dhrubajitpc.github.io/sg-tech-events/**

Rebuilt every Monday morning (08:00 SGT) by a scheduled GitHub Actions job.
Copilot CLI researches the listings and rewrites the page; a validator decides
whether the result is publishable. If a run produces something broken, nothing is
committed and the previous week's page stays live.

## Repository

| Path | Purpose |
|---|---|
| `site/index.html` | The digest. Self-contained: inline CSS and JS, no build step, no dependencies. |
| `PROMPT.md` | The instructions Copilot follows each run — sources, scope, tag vocabulary. |
| `tools/validate.mjs` | Pre-publish gate. Schema, past dates, URL sanity, freshness. |
| `.github/workflows/digest.yml` | Cron, generation, validation, commit, Pages deploy. |
| `DESIGN.md` | How the automation fits together and why. |

## Running it by hand

A full run — research, validate, commit, deploy:

```bash
gh workflow run digest.yml -R DhrubajitPC/sg-tech-events
```

Republish the committed page without spending a Copilot run:

```bash
gh workflow run digest.yml -R DhrubajitPC/sg-tech-events -f skip_refresh=true
```

## Validating a local edit

```bash
node tools/validate.mjs site/index.html
```

The validator requires the `data-updated` stamp to be today's date in SGT, so
editing the page by hand on a different day needs an override:

```bash
SG_TODAY=2026-08-05 node tools/validate.mjs site/index.html
```

## Setup

The workflow needs one secret: `COPILOT_GITHUB_TOKEN`, a personal access token
with the **Copilot Requests** permission. See `DESIGN.md` for why a PAT is
required rather than the built-in `GITHUB_TOKEN`.
