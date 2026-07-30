/**
 * Smart table sorting.
 *
 * Real dashboards hand us columns of formatted strings — "735.0MB", "1.6GB",
 * "12.5%", "2.5s", "350ms", "v1.10.0" — where a plain string compare puts
 * 1.6GB below 735MB. These helpers sniff what a column actually holds and
 * compare by magnitude instead. Detection is per column (not per cell) so a
 * column stays on one ruler even when a few cells are odd.
 */

export type SortKind =
  | "text"
  | "natural"
  | "number"
  | "bytes"
  | "percent"
  | "duration"
  | "currency"
  | "datetime"
  | "version"
  | "boolean";

export type SortValue = string | number | boolean | null | undefined;

export interface SortRule {
  kind: SortKind;
  /** Explicit category ordering; values not listed sort after the listed ones. */
  order?: readonly string[] | null;
  /** Where empty cells land, independent of direction. */
  nulls?: "first" | "last";
}

const BYTE_UNITS: Record<string, number> = {
  b: 1,
  byte: 1,
  bytes: 1,
  k: 1e3,
  kb: 1e3,
  kib: 1024,
  m: 1e6,
  mb: 1e6,
  mib: 1024 ** 2,
  g: 1e9,
  gb: 1e9,
  gib: 1024 ** 3,
  t: 1e12,
  tb: 1e12,
  tib: 1024 ** 4,
  p: 1e15,
  pb: 1e15,
  pib: 1024 ** 5,
  e: 1e18,
  eb: 1e18,
  eib: 1024 ** 6,
};

const DURATION_UNITS: Record<string, number> = {
  ns: 1e-6,
  us: 1e-3,
  µs: 1e-3,
  ms: 1,
  s: 1e3,
  sec: 1e3,
  secs: 1e3,
  second: 1e3,
  seconds: 1e3,
  m: 60e3,
  min: 60e3,
  mins: 60e3,
  minute: 60e3,
  minutes: 60e3,
  h: 3600e3,
  hr: 3600e3,
  hrs: 3600e3,
  hour: 3600e3,
  hours: 3600e3,
  d: 86400e3,
  day: 86400e3,
  days: 86400e3,
  w: 604800e3,
  wk: 604800e3,
  week: 604800e3,
  weeks: 604800e3,
  y: 31557600e3,
  yr: 31557600e3,
  year: 31557600e3,
  years: 31557600e3,
};

/** Metric suffixes on bare counts: 1.2k, 3M, 4.5B. */
const SI_SUFFIX: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9, g: 1e9, t: 1e12 };

const CURRENCY_SYMBOLS = "$€£¥₩₽₹₿¢";
const CURRENCY_CODES = /^(usd|eur|gbp|jpy|chf|cad|aud|cny|sek|nok|btc|eth)$/i;

const NUMBER_BODY = String.raw`[+-]?(?:\d{1,3}(?:[,  ]\d{3})+|\d+)(?:\.\d+)?`;

const NUMBER_RE = new RegExp(String.raw`^\s*(${NUMBER_BODY})\s*$`);
const SI_NUMBER_RE = new RegExp(String.raw`^\s*(${NUMBER_BODY})\s*([kmbgt])\s*$`, "i");
const PERCENT_RE = new RegExp(String.raw`^\s*(${NUMBER_BODY})\s*%\s*$`);
const BYTES_RE = new RegExp(
  String.raw`^\s*(${NUMBER_BODY})\s*(bytes|byte|[kmgtpe]i?b|[kmgtpe]i|[kmgtpe]|b)\s*$`,
  "i",
);
const CURRENCY_RE = new RegExp(
  String.raw`^\s*([+-])?\s*(?:([${CURRENCY_SYMBOLS}])\s*)?(${NUMBER_BODY})\s*(?:([${CURRENCY_SYMBOLS}])|([a-z]{3}))?\s*$`,
  "i",
);
const DURATION_PART_RE = /([+-]?\d+(?:\.\d+)?)\s*(ns|us|µs|ms|sec(?:s|ond|onds)?|s|min(?:s|ute|utes)?|m|h(?:r|rs|our|ours)?|d(?:ay|ays)?|w(?:k|eek|eeks)?|y(?:r|ear|ears)?)/gi;
const CLOCK_RE = /^\s*([+-]?)(\d+):([0-5]?\d)(?::([0-5]?\d(?:\.\d+)?))?\s*$/;
const VERSION_RE = /^\s*v?\d+(\.\d+){1,3}(?:[-+][0-9a-z.-]+)?\s*$/i;
const ISO_DATE_RE = /^\s*\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?\s*$/;
const SLASHED_DATE_RE = /^\s*\d{1,2}\/\d{1,2}\/\d{2,4}(?:[T ,]\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?)?\s*$/i;
const NAMED_DATE_RE =
  /^\s*(?:\d{1,2}\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,4}(?:,?\s+\d{4})?(?:[T ,]\s*\d{1,2}:\d{2}(?::\d{2})?)?\s*$/i;
const BOOL_RE = /^\s*(true|false|yes|no|on|off|enabled|disabled|y|n)\s*$/i;
const TRUTHY_RE = /^\s*(true|yes|on|enabled|y)\s*$/i;
// Integer chunks only: "10.0.0.2" must compare octet by octet, not as decimals.
const DIGIT_CHUNK_RE = /(\d+)/;

const stripSeparators = (raw: string): number => Number(raw.replace(/[,  \s]/g, ""));

const asText = (value: SortValue): string | null => {
  if (value == null) return null;
  if (typeof value === "boolean") return value ? "true" : "false";
  const text = String(value).trim();
  return text === "" ? null : text;
};

export function parseNumber(text: string): number | null {
  const plain = NUMBER_RE.exec(text);
  if (plain) return stripSeparators(plain[1]);
  const si = SI_NUMBER_RE.exec(text);
  if (si) return stripSeparators(si[1]) * SI_SUFFIX[si[2].toLowerCase()];
  return null;
}

export function parsePercent(text: string): number | null {
  const match = PERCENT_RE.exec(text);
  return match ? stripSeparators(match[1]) : null;
}

/** Bytes, normalised to a byte count. Bare "1.6G" counts; a bare number does not. */
export function parseBytes(text: string): number | null {
  const match = BYTES_RE.exec(text);
  if (!match) return null;
  const scale = BYTE_UNITS[match[2].toLowerCase()];
  return scale == null ? null : stripSeparators(match[1]) * scale;
}

/** Durations, normalised to milliseconds. Handles "1h 23m", "350ms", "01:23:45". */
export function parseDuration(text: string): number | null {
  const clock = CLOCK_RE.exec(text);
  if (clock) {
    const sign = clock[1] === "-" ? -1 : 1;
    const first = Number(clock[2]);
    const second = Number(clock[3]);
    const third = clock[4] != null ? Number(clock[4]) : null;
    // "1:23" is minutes:seconds; "1:23:45" is hours:minutes:seconds.
    const ms = third == null ? first * 60e3 + second * 1e3 : first * 3600e3 + second * 60e3 + third * 1e3;
    return sign * ms;
  }
  DURATION_PART_RE.lastIndex = 0;
  let total = 0;
  let consumed = 0;
  let match: RegExpExecArray | null;
  while ((match = DURATION_PART_RE.exec(text)) !== null) {
    const scale = DURATION_UNITS[match[2].toLowerCase()];
    if (scale == null) return null;
    total += Number(match[1]) * scale;
    consumed += match[0].length;
  }
  if (consumed === 0) return null;
  // Reject strings that are mostly something else ("3 monitors", "2 slots").
  const residue = text.replace(DURATION_PART_RE, "").replace(/[\s,]/g, "");
  return residue === "" ? total : null;
}

export function parseCurrency(text: string): number | null {
  const match = CURRENCY_RE.exec(text);
  if (!match) return null;
  const hasSymbol = match[2] != null || match[4] != null;
  const code = match[5];
  if (!hasSymbol && !(code && CURRENCY_CODES.test(code))) return null;
  const magnitude = stripSeparators(match[3]);
  return match[1] === "-" ? -magnitude : magnitude;
}

export function parseDateTime(text: string): number | null {
  if (!ISO_DATE_RE.test(text) && !SLASHED_DATE_RE.test(text) && !NAMED_DATE_RE.test(text)) {
    return null;
  }
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? null : ms;
}

/** Version strings ranked so 1.10.0 > 1.9.0; prereleases sort below their release. */
export function parseVersion(text: string): number[] | null {
  if (!VERSION_RE.test(text)) return null;
  const [core, ...rest] = text.trim().replace(/^v/i, "").split(/[-+]/);
  const parts = core.split(".").map((part) => Number(part));
  while (parts.length < 4) parts.push(0);
  // No prerelease tag ranks above any prerelease tag.
  parts.push(rest.length === 0 ? 1 : 0);
  return parts;
}

export function parseBoolean(text: string): number | null {
  if (!BOOL_RE.test(text)) return null;
  return TRUTHY_RE.test(text) ? 1 : 0;
}

/** Numeric projection of a value under a rule's kind; null when it doesn't apply. */
export function sortNumber(value: SortValue, kind: SortKind): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? 1 : 0;
  const text = asText(value);
  if (text == null) return null;
  switch (kind) {
    case "number":
      return parseNumber(text);
    case "percent":
      return parsePercent(text) ?? parseNumber(text);
    case "bytes":
      return parseBytes(text) ?? parseNumber(text);
    case "duration":
      return parseDuration(text) ?? parseNumber(text);
    case "currency":
      return parseCurrency(text) ?? parseNumber(text);
    case "datetime":
      return parseDateTime(text);
    case "boolean":
      return parseBoolean(text);
    default:
      return null;
  }
}

/**
 * Chunked alphanumeric compare: "pid 9" < "pid 10", "10.0.0.2" < "10.0.0.10".
 * Used for `natural` and as the tie-break/fallback for every other kind.
 */
export function compareNatural(a: string, b: string): number {
  const left = a.split(DIGIT_CHUNK_RE).filter((part) => part !== "");
  const right = b.split(DIGIT_CHUNK_RE).filter((part) => part !== "");
  const len = Math.min(left.length, right.length);
  for (let i = 0; i < len; i += 1) {
    const l = left[i];
    const r = right[i];
    const ln = Number(l);
    const rn = Number(r);
    const bothNumeric = !Number.isNaN(ln) && !Number.isNaN(rn) && /\d/.test(l) && /\d/.test(r);
    if (bothNumeric) {
      if (ln !== rn) return ln < rn ? -1 : 1;
      continue;
    }
    const cmp = l.localeCompare(r, undefined, { sensitivity: "base" });
    if (cmp !== 0) return cmp;
  }
  return left.length - right.length;
}

const compareVersions = (a: number[], b: number[]): number => {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const l = a[i] ?? 0;
    const r = b[i] ?? 0;
    if (l !== r) return l < r ? -1 : 1;
  }
  return 0;
};

const isEmpty = (value: SortValue): boolean => value == null || (typeof value === "string" && value.trim() === "");

const categoryRank = (value: SortValue, order: readonly string[]): number => {
  const text = (asText(value) ?? "").toLocaleLowerCase();
  const index = order.findIndex((entry) => entry.toLocaleLowerCase() === text);
  return index === -1 ? order.length : index;
};

/**
 * Compare two cell values under a rule. Returns an ascending-order comparison;
 * empty cells are pinned per `rule.nulls` and must not be flipped by the caller
 * when descending, which is why they are reported via `nullBias` sign here.
 */
export function compareValues(a: SortValue, b: SortValue, rule: SortRule): number {
  if (rule.order && rule.order.length > 0) {
    const ai = categoryRank(a, rule.order);
    const bi = categoryRank(b, rule.order);
    if (ai !== bi) return ai < bi ? -1 : 1;
  }
  if (rule.kind !== "text" && rule.kind !== "natural") {
    const an = sortNumber(a, rule.kind);
    const bn = sortNumber(b, rule.kind);
    if (an != null && bn != null) {
      // Equal magnitudes tie: rows keep their incoming order.
      return an === bn ? 0 : an < bn ? -1 : 1;
    } else if (an != null) {
      return -1; // parsed values outrank unparseable ones
    } else if (bn != null) {
      return 1;
    }
  }
  if (rule.kind === "version") {
    const av = parseVersion(asText(a) ?? "");
    const bv = parseVersion(asText(b) ?? "");
    if (av && bv) {
      const cmp = compareVersions(av, bv);
      if (cmp !== 0) return cmp;
    } else if (av) {
      return -1;
    } else if (bv) {
      return 1;
    }
  }
  const at = asText(a) ?? "";
  const bt = asText(b) ?? "";
  if (rule.kind === "text") return at.localeCompare(bt, undefined, { sensitivity: "base" });
  return compareNatural(at, bt);
}

/**
 * Full comparator including direction and null placement. `desc` flips only the
 * value comparison — empty cells stay where `rule.nulls` puts them.
 */
export function makeComparator(rule: SortRule, desc: boolean): (a: SortValue, b: SortValue) => number {
  const nullsFirst = rule.nulls === "first";
  return (a, b) => {
    const ae = isEmpty(a);
    const be = isEmpty(b);
    if (ae && be) return 0;
    if (ae) return nullsFirst ? -1 : 1;
    if (be) return nullsFirst ? 1 : -1;
    const cmp = compareValues(a, b, rule);
    return desc ? -cmp : cmp;
  };
}

/**
 * Comparator for table engines that negate the result themselves on descending
 * sorts (TanStack does). Values compare ascending; the empty-cell decision is
 * pre-flipped so it survives that negation and stays pinned per `rule.nulls`.
 */
export function preNegatedComparator(rule: SortRule, desc: boolean): (a: SortValue, b: SortValue) => number {
  const nullsFirst = rule.nulls === "first";
  return (a, b) => {
    const ae = isEmpty(a);
    const be = isEmpty(b);
    if (ae && be) return 0;
    if (ae || be) {
      const cmp = ae === nullsFirst ? -1 : 1;
      return desc ? -cmp : cmp;
    }
    return compareValues(a, b, rule);
  };
}

interface KindProbe {
  kind: SortKind;
  test: (text: string) => boolean;
}

// Order matters: the first kind that claims enough of the column wins.
const PROBES: KindProbe[] = [
  { kind: "boolean", test: (text) => parseBoolean(text) != null },
  { kind: "percent", test: (text) => parsePercent(text) != null },
  { kind: "bytes", test: (text) => parseBytes(text) != null },
  { kind: "duration", test: (text) => parseDuration(text) != null },
  { kind: "currency", test: (text) => parseCurrency(text) != null },
  { kind: "datetime", test: (text) => parseDateTime(text) != null },
  { kind: "version", test: (text) => parseVersion(text) != null },
  { kind: "number", test: (text) => parseNumber(text) != null },
];

const DETECTION_SAMPLE = 200;
const DETECTION_THRESHOLD = 0.8;

/**
 * Infer how a column should be compared from the values it actually holds.
 * A kind wins when it parses at least 80% of the non-empty samples; otherwise
 * the column falls back to `natural`, which still orders embedded numbers well.
 */
export function detectSortKind(values: Iterable<SortValue>): SortKind {
  const samples: string[] = [];
  let numeric = 0;
  let seen = 0;
  for (const value of values) {
    if (isEmpty(value)) continue;
    seen += 1;
    if (typeof value === "number") numeric += 1;
    else if (typeof value === "boolean") samples.push(value ? "true" : "false");
    else samples.push(String(value).trim());
    if (seen >= DETECTION_SAMPLE) break;
  }
  if (seen === 0) return "natural";
  if (numeric === seen) return "number";
  if (numeric > 0) {
    // Mixed raw numbers and text: only a kind that also reads the numbers works.
    const claimed = PROBES.find(
      (probe) => probe.kind !== "boolean" && probe.kind !== "datetime" && probe.kind !== "version"
        && samples.filter((text) => probe.test(text)).length / samples.length >= DETECTION_THRESHOLD,
    );
    return claimed?.kind ?? "natural";
  }
  for (const probe of PROBES) {
    const hits = samples.reduce((count, text) => count + (probe.test(text) ? 1 : 0), 0);
    if (hits / samples.length >= DETECTION_THRESHOLD) return probe.kind;
  }
  return "natural";
}

/** Contract `value_type` → sort kind, for columns that declare one. */
export function sortKindForValueType(valueType: string | undefined): SortKind | null {
  switch (valueType) {
    case "number":
      return "number";
    case "date":
      return "datetime";
    case "boolean":
      return "boolean";
    case "text":
      return "natural";
    default:
      return null;
  }
}

/**
 * Resolve the rule for one column: an explicit `sort_as` wins, then an explicit
 * `value_type`, then sniffing the column's own values.
 */
export function resolveSortRule(
  column: { sort_as?: string | null; value_type?: string; sort_order?: readonly string[] | null; sort_nulls?: "first" | "last" },
  values: Iterable<SortValue>,
): SortRule {
  const explicit = column.sort_as && column.sort_as !== "auto" ? (column.sort_as as SortKind) : null;
  const kind = explicit ?? sortKindForValueType(column.value_type) ?? detectSortKind(values);
  return { kind, order: column.sort_order ?? null, nulls: column.sort_nulls ?? "last" };
}
