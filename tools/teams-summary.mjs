#!/usr/bin/env node
// Builds the Teams webhook payload: an Adaptive Card summarizing the
// published digest, wrapped in the shared-secret envelope the Power
// Automate flow checks for. Printed to stdout so the workflow can pipe
// it straight into curl.
import { readFileSync } from "node:fs";
import { evalArray } from "./events.mjs";

const file = process.argv[2] ?? "site/index.html";
const BASE_URL = "https://dhrubajitpc.github.io/techpulse-rsvp";
const ICON_URL = `${BASE_URL}/icon.png`;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 31; // "a month" of listed events, from the digest's own updated date

const src = readFileSync(file, "utf8");
const updated = src.match(/data-updated="([^"]+)"/)?.[1] ?? "unknown date";
// Link the notification to this week's own dated snapshot rather than root,
// so it keeps pointing at the right content even after root moves on.
const pageUrl = `${BASE_URL}/${updated}/`;

// Plain YYYY-MM-DD dates, parsed as UTC so calendar-day comparisons below
// aren't sensitive to the runner's local timezone.
function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDMY(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const windowStart = parseISO(updated);
const windowEnd = new Date(windowStart.getTime() + WINDOW_DAYS * ONE_DAY_MS);

const allEvents = evalArray(src, "EVENTS").sort((a, b) => a.date.localeCompare(b.date));
const events = allEvents.filter((e) => {
  const d = parseISO(e.date);
  return d >= windowStart && d <= windowEnd;
});

function cell(text, header = false) {
  return {
    type: "TableCell",
    items: [{ type: "TextBlock", text, wrap: true, size: "Small", weight: header ? "Bolder" : "Default" }],
  };
}

function row(cells) {
  return { type: "TableRow", cells };
}

const table = {
  type: "Table",
  firstRowAsHeaders: true,
  gridStyle: "default",
  columns: [{ width: 1 }, { width: 3 }, { width: 1 }, { width: 2 }],
  rows: [
    row([cell("Date", true), cell("Event", true), cell("Format", true), cell("Tags", true)]),
    ...events.map((e) =>
      row([
        cell(formatDMY(e.date)),
        cell(`[${e.name}](${e.url})`),
        cell(e.format),
        cell(e.tags.join(", ")),
      ])
    ),
  ],
};

const summaryText =
  events.length > 0
    ? `${events.length} event${events.length === 1 ? "" : "s"} in the next month — updated ${formatDMY(updated)}`
    : `No events in the next month — updated ${formatDMY(updated)}. See the full digest for what's further out.`;

const card = {
  type: "AdaptiveCard",
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [
    {
      type: "ColumnSet",
      columns: [
        { type: "Column", width: "auto", items: [{ type: "Image", url: ICON_URL, width: "32px", height: "32px" }] },
        {
          type: "Column",
          width: "stretch",
          verticalContentAlignment: "Center",
          items: [{ type: "TextBlock", text: "TechPulse RSVP", weight: "Bolder", size: "Medium" }],
        },
      ],
    },
    { type: "TextBlock", text: summaryText, wrap: true, spacing: "Small" },
    ...(events.length > 0 ? [table] : []),
    { type: "TextBlock", text: `[Full digest](${pageUrl})`, wrap: true, spacing: "Medium" },
  ],
};

process.stdout.write(JSON.stringify({
  secret: process.env.TEAMS_WEBHOOK_SECRET ?? "",
  type: "message",
  attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: card }],
}));
