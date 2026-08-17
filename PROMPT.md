# Refresh the Singapore tech events digest

You are running non-interactively inside a GitHub Actions job, in a checkout of
this repository. Your job is to rebuild `site/index.html` so it lists current
technology events in Singapore. Do not commit, push, or open a pull request —
the workflow does that after your work passes validation.

## Objective

Produce an up-to-date list of tech events — online and in person — happening in
or accessible from Singapore, focused on: AI / machine learning / GenAI / LLMs,
software engineering practice, frontend, backend, cloud / DevOps / platform
engineering, and data engineering.

Exclude events that are purely marketing, sales, recruitment-only, real
estate/construction, or non-technical business networking, unless the technical
content is substantial. Also exclude paid vendor training courses.

## Steps

1. Run `date -u +%Y-%m-%d` to establish today's date. Events are dated in
   Singapore time (UTC+8), so if the run is late in the UTC day, add a day.
   The digest covers **events from today through roughly the next 8 weeks**,
   plus a short tail of notable larger conferences further out in the year.

2. Read the current `site/index.html`. Its `EVENTS` and `GROUPS` arrays are the
   starting point and its structure and styling are the template — reuse them
   exactly. Carry forward any listed event that is still upcoming and still
   verifiable rather than re-researching it from nothing.

3. Research current listings. Check at least these sources every run:
   - https://techmeetups.io/singapore and https://techmeetups.io/singapore/conferences
   - https://singapore.aitinkerers.org/ — AI Tinkerers Singapore demo nights
   - https://globalai.community/chapters/singapore — Global AI Singapore, AgentCon
   - https://dev.events/meetups/AS/SG/Singapore and https://dev.events/conferences/AS/SG/Singapore
   - https://www.sginnovate.com/events — SGInnovate deep-tech talks
   - https://www.developer.tech.gov.sg/communities/events/ — STACK conference and meetups
   - https://ocgroups.dev/cncf/group/v58wadq — Cloud Native Singapore (CNCF moved its
     community platform off community.cncf.io; that old URL now redirects here)
   - Eventbrite category pages for Singapore:
     https://www.eventbrite.com/d/singapore--singapore/tech/,
     https://www.eventbrite.com/d/singapore--singapore/software-engineering/,
     https://www.eventbrite.sg/d/singapore--singapore/artificial-intelligence/
   - Meetup.com group event pages for the active Singapore communities, especially:
     SingaporeJS (singapore-js), ReactJS Singapore (react-singapore),
     Singapore Frontend (singapore-frontend), Vue JS Singapore (Vue-JS-Singapore),
     GoSG (golangsg), Rust Singapore (rust-singapore),
     .NET Developers SG (net-developers-sg), GraphQL Singapore (graphql-sg),
     DevOps Singapore (devops-singapore), Platform Engineers Singapore (platform-engineers-singapore),
     AWS User Group Singapore (aws-sg), KSUG.AI APAC (ksug-sg),
     SingaDev (singadev), Junior Developers Singapore (junior-developers-singapore),
     Singapore Data & AI Engineering (singapore-data-engineering-meetup),
     Data Engineering Singapore (data-engineering-sg), PyData SG (pydata-sg),
     Machine Learning Singapore (machine-learning-singapore),
     Singapore AI Developers Group (singapore-ai-developers-group),
     Singapore AI ML & Computer Vision (singapore-computer-vision-meetup),
     Women Devs SG (women-devs-sg),
     STACK Community Powered by GovTech Singapore (stack-by-govtech-singapore),
     Tech Talks by Thoughtworks (ThoughtWorks-Talks-Tech)
   - Also run one or two fresh web searches such as
     "Singapore tech meetup <current month> <year>", "Singapore AI meetup <month>",
     "Singapore developer conference <year>" to catch anything the aggregators miss.

   If a fetch returns only a page shell or a JavaScript-loading placeholder, do
   not retry it repeatedly — move on to another source. Meetup.com group pages
   often render their event list client-side and report zero upcoming events even
   when events exist; when that happens, try a web search for that group's name
   plus the month instead. If a domain cannot be fetched at all, do not try to
   reach it by another route.

4. For each event capture: ISO date, a human display string ("Aug 5",
   "Aug 27–28"), event name, venue or "Online", local start time where known,
   a one-sentence description, format ("In person" or "Online"), topic tags
   drawn from **exactly** this set — "AI", "Software Engineering", "Frontend",
   "Backend/Cloud", "Data" — and a working registration or details URL.

5. Drop events whose date has already passed. Deduplicate events that appear on
   more than one aggregator, preferring the organiser's own page for the URL.
   Aim for accuracy over volume: it is better to list 8 verified events than 25
   speculative ones. **Do not invent events, dates, or URLs.** If you cannot
   confirm a detail, omit the event. Where two sources disagree on a date, trust
   the organiser's own page; if neither is clearly the organiser, omit the event.

6. Rewrite `site/index.html`:
   - Replace the `EVENTS` array. Keep events sorted by ISO date.
   - Keep the `GROUPS` array roughly as-is. Add or remove a community only with
     clear evidence that a group is newly active or defunct.
   - Update both the visible date text and the `data-updated` attribute on
     `<span id="updated">` to today's date. The attribute must be `YYYY-MM-DD`.
   - Change nothing else: keep the CSS, the filter chips, the month grouping,
     the light/dark theming, the communities grid, the Sources section and the
     footer exactly as they are.

7. Run `node tools/validate.mjs site/index.html`. It checks the schema, rejects
   past dates, non-https or placeholder URLs, tags outside the allowed set, and a
   stale `data-updated` stamp. **Fix every problem it reports and re-run until it
   passes.** If it cannot pass — for example because you could not verify a
   single event — leave `site/index.html` unchanged and say so in your final
   message. A stale page is better than a broken one.

8. Finish with a short summary: how many events are listed, the three most
   notable in the next two weeks with their dates, and what is newly added since
   the previous version. A few lines. The page holds the detail.

## Constraints

- Singapore-based, or online events at times workable from SGT (UTC+8). Note the
  local start time for online events. An online event that starts at 1 AM SGT is
  not workable — leave it out.
- Concise, direct writing in the descriptions. No filler, no marketing language.
- Never fabricate a URL. Every link must be one you actually found while
  researching this run.
