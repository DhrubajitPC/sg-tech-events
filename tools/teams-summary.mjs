#!/usr/bin/env node
// Builds the Teams webhook payload: an Adaptive Card summarizing the
// published digest, wrapped in the shared-secret envelope the Power
// Automate flow checks for. Printed to stdout so the workflow can pipe
// it straight into curl.
import { readFileSync } from "node:fs";
import { evalArray } from "./events.mjs";

const file = process.argv[2] ?? "site/index.html";
const BASE_URL = "https://dhrubajitpc.github.io/sg-tech-events";
const MAX_LISTED = 8;

const src = readFileSync(file, "utf8");
const updated = src.match(/data-updated="([^"]+)"/)?.[1] ?? "unknown date";
// Link the notification to this week's own dated snapshot rather than root,
// so it keeps pointing at the right content even after root moves on.
const pageUrl = `${BASE_URL}/${updated}/`;
const events = evalArray(src, "EVENTS").sort((a, b) => a.date.localeCompare(b.date));

const listed = events.slice(0, MAX_LISTED);
const remaining = events.length - listed.length;

const lines = listed.map(
  (e) => `- **${e.display}** — [${e.name}](${e.url}) (${e.tags.join(", ")})`
);
if (remaining > 0) lines.push(`- …and ${remaining} more on the full page.`);

const card = {
  type: "AdaptiveCard",
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.4",
  body: [
    { type: "TextBlock", text: `SG Tech Events digest — ${updated} — ${events.length} events`, weight: "Bolder", size: "Medium" },
    { type: "TextBlock", text: lines.join("\n\n"), wrap: true },
    { type: "TextBlock", text: `[Full digest](${pageUrl})`, wrap: true },
  ],
};

process.stdout.write(JSON.stringify({
  secret: process.env.TEAMS_WEBHOOK_SECRET ?? "",
  type: "message",
  attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: card }],
}));
