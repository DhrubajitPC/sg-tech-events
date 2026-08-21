# TechPulse RSVP

A weekly digest of technology meetups and conferences in Singapore — AI,
software engineering, frontend, backend, cloud and data.

**Read it here: https://dhrubajitpc.github.io/techpulse-rsvp/** — that URL
always shows the latest digest. Each past week stays reachable at its own
dated URL, e.g. `https://dhrubajitpc.github.io/techpulse-rsvp/2026-08-17/`.

Rebuilt every Monday morning (09:00 SGT) by a scheduled GitHub Actions job.
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
gh workflow run digest.yml -R DhrubajitPC/techpulse-rsvp
```

Republish the committed page without spending a Copilot run:

```bash
gh workflow run digest.yml -R DhrubajitPC/techpulse-rsvp -f skip_refresh=true
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

## Cloud setup

The repository is designed to run entirely on GitHub-hosted Actions and publish
to GitHub Pages. In **Settings > Pages**, set the source to **GitHub Actions**.
The workflow deploys the site at:

https://dhrubajitpc.github.io/techpulse-rsvp/

The refresh job uses the requested `claude-opus-5` model through Copilot CLI.
Create a fine-grained personal access token with the **Copilot Requests**
permission and save it as the repository Actions secret
`COPILOT_GITHUB_TOKEN` under **Settings > Secrets and variables > Actions**.
The job fails visibly if the token or requested model is unavailable, and an
invalid generated page is never committed or deployed.

The workflow also supports manual runs from the **Actions** tab. Set
`skip_refresh` to `true` to republish the current committed page without using a
Copilot request.
