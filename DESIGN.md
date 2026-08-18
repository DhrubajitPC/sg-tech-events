# How this works

A scheduled GitHub Actions job rebuilds a single static page every Monday
morning and publishes it to GitHub Pages. Copilot CLI does the research and
writes the HTML; a validator decides whether the result is fit to publish.

## Layout

```
site/index.html                the digest — self-contained, inline CSS and JS
PROMPT.md                      the instructions Copilot follows each run
tools/validate.mjs             pre-publish gate
.github/workflows/digest.yml   cron, generation, validation, commit, deploy
```

`site/index.html` holds two arrays in its inline script — `EVENTS` and `GROUPS`
— plus the filter chips, month grouping and communities grid that render them.
The file is both the published artifact and the template: each run reads the
current version, so styling stays stable and every week is a reviewable diff.

`site/` also accumulates a `<date>/index.html` snapshot per week (see
Publishing below) — root always shows the latest digest, each dated folder is
that week's page frozen in place.

## The weekly run

`cron: "0 1 * * 1"` — Monday 01:00 UTC, which is Monday 09:00 SGT. GitHub delays
scheduled runs under load, so treat the time as approximate. `workflow_dispatch`
is enabled for manual runs.

The `refresh` job installs Copilot CLI and runs it with `PROMPT.md` as the
prompt, explicitly requesting `claude-opus-5`. Copilot researches the sources listed there, rewrites `EVENTS`, updates
the `data-updated` stamp, and runs the validator itself before finishing. The
job then re-runs the validator independently, commits `site/index.html` if it
changed, and the `deploy` job publishes `site/` to Pages.

Before committing, the refresh job also copies `site/index.html` into
`site/<data-updated date>/index.html` — a frozen snapshot at that week's own
URL, e.g. `https://dhrubajitpc.github.io/sg-tech-events/2026-08-17/`. The date
comes from the page's own `data-updated` stamp, not the runner's UTC clock, so
it always matches what the page says. `site/index.html` at the root keeps being
overwritten every week, so the root URL always serves the latest digest while
every past week stays reachable at its own dated URL.

`deploy` runs when `refresh` succeeded *or* was skipped, and never when it
failed. The skipped case is the `skip_refresh` dispatch input, which republishes
whatever is committed without spending a Copilot run — useful after editing the
page by hand, or to get a first deploy out before the secret exists:

```bash
gh workflow run digest.yml -R DhrubajitPC/sg-tech-events -f skip_refresh=true
```

## Why the validator exists

An unattended generator will eventually produce something wrong: an empty
`EVENTS` array, a hallucinated URL, a date left over from last month, a
half-written file. `tools/validate.mjs` fails the job on any of that, so nothing
is committed and **the previously published page stays live**. A stale digest is
a much better failure than a blank or fabricated one.

It enforces:

- the file is complete (`</html>` present, has a `<title>`, plausible size)
- `EVENTS` and `GROUPS` parse as arrays and `EVENTS` is non-empty
- every event has a real calendar date in `YYYY-MM-DD`, not in the past
- `format` is `In person` or `Online`; tags come only from
  `AI`, `Software Engineering`, `Frontend`, `Backend/Cloud`, `Data`
- every URL parses, uses https, and is not a placeholder
- no two events share a name and date
- `data-updated` equals today's date in SGT

"Today" is computed in SGT (UTC+8), not on the UTC runner, because the events
are dated in Singapore terms. `SG_TODAY=YYYY-MM-DD` overrides it for testing.

Run it locally with:

```bash
node tools/validate.mjs site/index.html
```

## Authentication

Copilot CLI authenticates with `COPILOT_GITHUB_TOKEN`, a repository secret
holding a fine-grained personal access token with the **Copilot Requests**
permission. Usage bills to that account's Copilot seat. The workflow requests
`claude-opus-5` explicitly; if that model is not enabled for the account, the
run fails rather than silently using a different model.

The simpler route — Copilot CLI authenticating with the built-in `GITHUB_TOKEN`
and a `copilot-requests: write` permission — is only available in
organization-owned repositories, and needs an org admin to enable the
"Allow use of Copilot CLI billed to the organization" policy. This repository is
personal, so it uses the PAT. To enable Pages, set the repository's Pages source
to **GitHub Actions** under **Settings > Pages**. The published site is
https://dhrubajitpc.github.io/sg-tech-events/.

## Publishing

Pages is served from the workflow (`actions/deploy-pages`) rather than from a
branch folder. The refresh job pushes with `GITHUB_TOKEN`, and pushes made with
that token do not reliably trigger the separate Pages build, so the deploy is
explicit instead. The `deploy` job checks out `main` again to pick up the commit
the refresh job just pushed.

## Notifications

The `notify-teams` job posts an Adaptive Card to a Teams channel via a
Power Automate "When a Teams webhook request is received" workflow, after
`deploy` succeeds. `tools/teams-summary.mjs` reads the just-published
`site/index.html`; the card title includes the page's `data-updated` date,
and the body lists the soonest events (name, date, tags, up to 8) with a
count of how many more are on the full page — the same `EVENTS` parsing
`tools/validate.mjs` uses, shared via `tools/events.mjs`. The "Full digest"
link points at that week's own dated archive URL (see Publishing above), not
root, so old notifications keep linking to the right content. It requires two
repository secrets that aren't set up by default:

```bash
gh secret set TEAMS_WEBHOOK_URL -R DhrubajitPC/sg-tech-events
gh secret set TEAMS_WEBHOOK_SECRET -R DhrubajitPC/sg-tech-events
```

`TEAMS_WEBHOOK_URL` is the HTTP POST URL from the Teams-side workflow trigger.
`TEAMS_WEBHOOK_SECRET` is an arbitrary fixed string that must match the value
checked by that workflow's Condition step — Teams webhook triggers have no
schema field for it, so the check has to use the Expression
`triggerBody()?['secret']` rather than Dynamic Content. Without both secrets
set, `notify-teams` fails (the curl call errors on the missing URL) without
affecting `refresh` or `deploy` — the page still publishes either way.

## Changing what gets listed

Edit `PROMPT.md` — the sources, the topic scope, the exclusions and the tag
vocabulary all live there. If you change the tag set, change it in three places:
`PROMPT.md`, the `TOPICS` constant in `site/index.html`, and the `TOPICS` set in
`tools/validate.mjs`.

To change the schedule, edit the `cron` line. To have the digest reviewed before
it goes live, replace the commit step with a pull request.

## Known limitations

- Meetup.com renders event lists client-side and often reports zero upcoming
  events to a plain fetch, even for active groups. `PROMPT.md` tells Copilot to
  fall back to a web search for those groups. Coverage of the pure-frontend
  meetups is the weakest part of the digest as a result.
- Aggregator dates are unreliable. The seed run found techmeetups.io off by a day
  on AWS Community Day and dev.events serving global listings on a
  Singapore-filtered URL, which is why the prompt insists on the organiser's page.
- A generation that fails validation leaves the page untouched and fails the run.
  GitHub emails the repository owner on workflow failure. A successful publish
  also posts a Teams notification (see Notifications above), but that alert
  depends on the `TEAMS_WEBHOOK_URL`/`TEAMS_WEBHOOK_SECRET` secrets being set.
