// Shared parsing for the EVENTS/GROUPS array literals embedded in
// site/index.html. Used by both the pre-publish validator and the
// Teams notification summary.
import { runInNewContext } from "node:vm";

// Walks brackets while respecting string literals, so a "]" inside a
// description or URL does not end the array early.
export function extractArray(source, name) {
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

export function evalArray(source, name) {
  const literal = extractArray(source, name);
  const value = runInNewContext(`(${literal})`, Object.create(null), { timeout: 2000 });
  if (!Array.isArray(value)) throw new Error(`${name} is not an array`);
  return value;
}
