#!/usr/bin/env node
// Gate between generation and publication.
//
// The weekly job hands this script whatever Copilot wrote. If anything here
// fails, the workflow stops before committing, and last week's page stays live.
// A stale digest beats a broken or empty one.

import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const TOPICS = new Set(["AI", "Software Engineering", "Frontend", "Backend/Cloud", "Data"]);
const FORMATS = new Set(["In person", "Online"]);

const file = process.argv[2] ?? "site/index.html";

// Events are dated in Singapore terms, so "today" is today in SGT (UTC+8),
// not on the UTC runner. SG_TODAY overrides for testing.
const today = process.env.SG_TODAY ?? new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

const errors = [];
const fail = (msg) => errors.push(msg);

let src;
try {
  src = readFileSync(file, "utf8");
} catch (e) {
  console.error(`cannot read ${file}: ${e.message}`);
  process.exit(1);
}

// --- structural sanity: catch a truncated or half-written file early ---------
if (!/<\/html>\s*$/.test(src)) fail("file does not end with </html> — likely truncated");
if (!/<title>[^<]+<\/title>/.test(src)) fail("missing a non-empty <title>");
if (src.length < 2000) fail(`file is only ${src.length} bytes — implausibly small`);

// --- pull an array literal out of the inline script --------------------------
// Walks brackets while respecting string literals, so a "]" inside a
// description or URL does not end the array early.
function extractArray(source, name) {
  const decl = source.indexOf(`const ${name} = [`);
  if (decl === -1) throw new Error(`no "const ${name} = [" found`);
  const open = source.indexOf("[", decl);
  let depth = 0, quote = null;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === "\\") { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  throw new Error(`unterminated ${name} array`);
}

function evalArray(name) {
  const literal = extractArray(src, name);
  const value = runInNewContext(`(${literal})`, Object.create(null), { timeout: 2000 });
  if (!Array.isArray(value)) throw new Error(`${name} is not an array`);
  return value;
}

let EVENTS = [], GROUPS = [];
try { EVENTS = evalArray("EVENTS"); } catch (e) { fail(`EVENTS: ${e.message}`); }
try { GROUPS = evalArray("GROUPS"); } catch (e) { fail(`GROUPS: ${e.message}`); }

// --- last-updated stamp ------------------------------------------------------
const stamp = src.match(/data-updated="([^"]+)"/);
if (!stamp) {
  fail('missing data-updated="YYYY-MM-DD" on the last-updated element');
} else if (stamp[1] !== today) {
  fail(`data-updated is ${stamp[1]}, expected today in SGT (${today})`);
}

// --- events ------------------------------------------------------------------
const isoRe = /^\d{4}-\d{2}-\d{2}$/;
const str = (v) => typeof v === "string" && v.trim().length > 0;

if (EVENTS.length === 0) fail("EVENTS is empty — nothing to publish");

const seen = new Map();
EVENTS.forEach((e, i) => {
  const at = `EVENTS[${i}]${str(e?.name) ? ` (${e.name})` : ""}`;
  if (typeof e !== "object" || e === null) return fail(`${at} is not an object`);

  if (!isoRe.test(e.date ?? "")) {
    fail(`${at}: date must be YYYY-MM-DD, got ${JSON.stringify(e.date)}`);
  } else {
    const [y, m, d] = e.date.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCMonth() + 1 !== m || dt.getUTCDate() !== d) {
      fail(`${at}: ${e.date} is not a real calendar date`);
    }
    if (e.date < today) fail(`${at}: dated ${e.date}, which is in the past (today is ${today})`);
  }

  for (const field of ["display", "name", "venue", "description"]) {
    if (!str(e[field])) fail(`${at}: ${field} must be a non-empty string`);
  }
  if (e.time !== undefined && typeof e.time !== "string") fail(`${at}: time must be a string`);

  if (!FORMATS.has(e.format)) {
    fail(`${at}: format must be one of ${[...FORMATS].join(" / ")}, got ${JSON.stringify(e.format)}`);
  }

  if (!Array.isArray(e.tags) || e.tags.length === 0) {
    fail(`${at}: tags must be a non-empty array`);
  } else {
    for (const t of e.tags) {
      if (!TOPICS.has(t)) fail(`${at}: tag ${JSON.stringify(t)} is outside the allowed set (${[...TOPICS].join(", ")})`);
    }
  }

  if (!str(e.url)) {
    fail(`${at}: url is missing`);
  } else {
    let u;
    try { u = new URL(e.url); } catch { return fail(`${at}: url is not a valid URL: ${e.url}`); }
    if (u.protocol !== "https:") fail(`${at}: url must be https, got ${u.protocol}`);
    if (/(example\.com|localhost|TODO|PLACEHOLDER)/i.test(e.url)) fail(`${at}: url looks like a placeholder: ${e.url}`);
  }

  const key = `${e.date}|${String(e.name).toLowerCase().trim()}`;
  if (seen.has(key)) fail(`${at}: duplicate of EVENTS[${seen.get(key)}] — same name and date`);
  else seen.set(key, i);
});

// --- groups ------------------------------------------------------------------
if (GROUPS.length === 0) fail("GROUPS is empty — the communities grid would be blank");

GROUPS.forEach((g, i) => {
  const at = `GROUPS[${i}]${str(g?.name) ? ` (${g.name})` : ""}`;
  if (typeof g !== "object" || g === null) return fail(`${at} is not an object`);
  for (const field of ["name", "note", "url"]) {
    if (!str(g[field])) fail(`${at}: ${field} must be a non-empty string`);
  }
  if (str(g.url)) {
    try {
      const u = new URL(g.url);
      if (u.protocol !== "https:") fail(`${at}: url must be https, got ${u.protocol}`);
    } catch {
      fail(`${at}: url is not a valid URL: ${g.url}`);
    }
  }
});

// --- report ------------------------------------------------------------------
if (errors.length) {
  console.error(`\n✗ ${file} failed validation (${errors.length} problem${errors.length === 1 ? "" : "s"}):\n`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error("\nNothing was committed. The previously published page is unchanged.\n");
  process.exit(1);
}

const inPerson = EVENTS.filter((e) => e.format === "In person").length;
const soonest = EVENTS.map((e) => e.date).sort()[0];
console.log(`✓ ${file} passed`);
console.log(`  ${EVENTS.length} events (${inPerson} in person, ${EVENTS.length - inPerson} online)`);
console.log(`  ${GROUPS.length} communities`);
console.log(`  updated ${today}, next event ${soonest}`);
