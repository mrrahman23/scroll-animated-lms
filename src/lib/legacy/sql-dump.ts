/**
 * Reads the rows of `INSERT INTO` statements from a MySQL/phpMyAdmin dump (.sql export).
 * Only data is read — the dump is never executed.
 */
export type DumpRow = Record<string, string | number | null>;

export function parseDump(sql: string, tables: string[]): Record<string, DumpRow[]> {
  const out: Record<string, DumpRow[]> = Object.fromEntries(tables.map((t) => [t, []]));
  const head = /INSERT\s+INTO\s+`?(\w+)`?\s*\(([^)]*)\)\s*VALUES\s*/gi;
  let m: RegExpExecArray | null;
  while ((m = head.exec(sql))) {
    const table = m[1];
    const columns = m[2].split(",").map((c) => c.trim().replace(/`/g, ""));
    const { rows, end } = readTuples(sql, head.lastIndex);
    head.lastIndex = end;
    if (!(table in out)) continue;
    for (const values of rows) out[table].push(Object.fromEntries(columns.map((c, i) => [c, values[i] ?? null])));
  }
  return out;
}

/** Reads `(…),(…);` starting at `pos`; returns the tuples and where the statement ends. */
function readTuples(s: string, pos: number) {
  const rows: (string | number | null)[][] = [];
  let i = pos;
  const skipSpace = () => {
    while (i < s.length && /\s/.test(s[i])) i++;
  };
  while (i < s.length) {
    skipSpace();
    if (s[i] !== "(") break;
    i++;
    const values: (string | number | null)[] = [];
    for (;;) {
      skipSpace();
      if (s[i] === "'") {
        i++;
        let str = "";
        for (; i < s.length; i++) {
          const ch = s[i];
          if (ch === "\\") {
            const n = s[++i];
            str += n === "n" ? "\n" : n === "r" ? "\r" : n === "t" ? "\t" : n === "0" ? "\0" : n;
          } else if (ch === "'") {
            if (s[i + 1] === "'") {
              str += "'";
              i++;
            } else break;
          } else str += ch;
        }
        i++; // closing quote
        values.push(str);
      } else {
        const start = i;
        while (i < s.length && s[i] !== "," && s[i] !== ")") i++;
        const raw = s.slice(start, i).trim();
        values.push(/^null$/i.test(raw) ? null : raw !== "" && !Number.isNaN(Number(raw)) ? Number(raw) : raw);
      }
      skipSpace();
      if (s[i] === ",") {
        i++;
        continue;
      }
      if (s[i] === ")") {
        i++;
        break;
      }
      throw new Error(`Unexpected character "${s[i]}" in the SQL file near position ${i}`);
    }
    rows.push(values);
    skipSpace();
    if (s[i] === ",") {
      i++;
      continue;
    }
    if (s[i] === ";") i++;
    break;
  }
  return { rows, end: i };
}
