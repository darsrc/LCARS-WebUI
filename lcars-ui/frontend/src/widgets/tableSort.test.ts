import { describe, expect, it } from "vitest";
import {
  compareNatural,
  compareValues,
  detectSortKind,
  makeComparator,
  parseBytes,
  parseCurrency,
  parseDateTime,
  parseDuration,
  parseNumber,
  parsePercent,
  parseVersion,
  preNegatedComparator,
  resolveSortRule,
  sortNumber,
  type SortValue,
} from "./tableSort";

const sorted = (values: SortValue[], rule: Parameters<typeof makeComparator>[0], desc = false) =>
  [...values].sort(makeComparator(rule, desc));

describe("parsers", () => {
  it("reads byte sizes across units", () => {
    expect(parseBytes("1.6GB")).toBe(1.6e9);
    expect(parseBytes("735.0MB")).toBe(735e6);
    expect(parseBytes("1 GiB")).toBe(1024 ** 3);
    expect(parseBytes("512 bytes")).toBe(512);
    expect(parseBytes("3.9G")).toBe(3.9e9);
    expect(parseBytes("1,024KB")).toBe(1.024e6);
    expect(parseBytes("42")).toBeNull();
    expect(parseBytes("sleeping")).toBeNull();
  });

  it("reads durations as milliseconds", () => {
    expect(parseDuration("350ms")).toBe(350);
    expect(parseDuration("2.5s")).toBe(2500);
    expect(parseDuration("1h 23m")).toBe(3600e3 + 23 * 60e3);
    expect(parseDuration("01:23")).toBe(83e3);
    expect(parseDuration("1:23:45")).toBe(3600e3 + 23 * 60e3 + 45e3);
    expect(parseDuration("3 monitors")).toBeNull();
  });

  it("reads percents, numbers, currency, dates and versions", () => {
    expect(parsePercent("94.9%")).toBe(94.9);
    expect(parseNumber("1,234.5")).toBe(1234.5);
    expect(parseNumber("-42")).toBe(-42);
    expect(parseNumber("1.2k")).toBe(1200);
    expect(parseCurrency("$1,234.56")).toBe(1234.56);
    expect(parseCurrency("-$5")).toBe(-5);
    expect(parseCurrency("1234 USD")).toBe(1234);
    expect(parseCurrency("1234")).toBeNull();
    expect(parseDateTime("2026-07-30T10:00:00Z")).toBe(Date.parse("2026-07-30T10:00:00Z"));
    expect(parseDateTime("2743")).toBeNull();
    expect(parseVersion("v1.10.0")).not.toBeNull();
  });
});

describe("detectSortKind", () => {
  it("detects byte columns with mixed units", () => {
    expect(detectSortKind(["1.6GB", "3.9GB", "735.0MB", "12.0GB"])).toBe("bytes");
  });

  it("detects percent, duration, number, datetime and boolean columns", () => {
    expect(detectSortKind(["0%", "1%", "26.5%"])).toBe("percent");
    expect(detectSortKind(["350ms", "2.5s", "1h 4m"])).toBe("duration");
    expect(detectSortKind(["2743", "4147073", "12"])).toBe("number");
    expect(detectSortKind([1, 2, 3])).toBe("number");
    expect(detectSortKind(["2026-07-30", "2026-01-02"])).toBe("datetime");
    expect(detectSortKind(["yes", "no", "yes"])).toBe("boolean");
  });

  it("falls back to natural ordering for free text", () => {
    expect(detectSortKind(["uvicorn", "python3", "sleeping"])).toBe("natural");
    expect(detectSortKind([])).toBe("natural");
  });

  it("tolerates a minority of odd cells", () => {
    expect(detectSortKind(["1.6GB", "3.9GB", "735MB", "12GB", "n/a"])).toBe("bytes");
  });

  it("ignores empty cells when sniffing", () => {
    expect(detectSortKind(["", null, "1.6GB", "735MB", undefined])).toBe("bytes");
  });
});

describe("compareValues", () => {
  it("orders byte sizes by magnitude, not text", () => {
    const rule = { kind: "bytes" as const };
    expect(sorted(["1.6GB", "735.0MB", "3.9GB", "512KB"], rule)).toEqual([
      "512KB",
      "735.0MB",
      "1.6GB",
      "3.9GB",
    ]);
  });

  it("orders durations across units", () => {
    expect(sorted(["2.5s", "350ms", "1h", "45m"], { kind: "duration" })).toEqual([
      "350ms",
      "2.5s",
      "45m",
      "1h",
    ]);
  });

  it("orders versions numerically", () => {
    expect(sorted(["v1.9.0", "v1.10.0", "v1.10.0-rc1"], { kind: "version" })).toEqual([
      "v1.9.0",
      "v1.10.0-rc1",
      "v1.10.0",
    ]);
  });

  it("sorts unparseable cells after parseable ones", () => {
    expect(sorted(["n/a", "1GB", "2MB"], { kind: "bytes" })).toEqual(["2MB", "1GB", "n/a"]);
  });

  it("applies an explicit category order", () => {
    const rule = { kind: "text" as const, order: ["running", "sleeping", "stopped"] };
    expect(sorted(["stopped", "zombie", "running", "sleeping"], rule)).toEqual([
      "running",
      "sleeping",
      "stopped",
      "zombie",
    ]);
  });

  it("compares embedded numbers naturally", () => {
    expect(compareNatural("pid 9", "pid 10")).toBeLessThan(0);
    expect(compareNatural("10.0.0.2", "10.0.0.10")).toBeLessThan(0);
    expect(sorted(["8.0GB / 30.3GB", "12.0GB / 30.3GB"], { kind: "natural" })).toEqual([
      "8.0GB / 30.3GB",
      "12.0GB / 30.3GB",
    ]);
  });

  it("reverses on descending but keeps empties pinned", () => {
    expect(sorted(["1GB", null, "2GB"], { kind: "bytes" }, true)).toEqual(["2GB", "1GB", null]);
    expect(sorted(["1GB", null, "2GB"], { kind: "bytes", nulls: "first" }, true)).toEqual([
      null,
      "2GB",
      "1GB",
    ]);
  });
});

describe("preNegatedComparator", () => {
  it("keeps empties last after the engine negates a descending sort", () => {
    const cmp = preNegatedComparator({ kind: "bytes" }, true);
    const engineOrder = ["1GB", "", "2GB"].sort((a, b) => -cmp(a, b));
    expect(engineOrder).toEqual(["2GB", "1GB", ""]);
  });
});

describe("resolveSortRule", () => {
  it("prefers an explicit sort_as over sniffing", () => {
    const rule = resolveSortRule({ sort_as: "text" }, ["1.6GB", "735MB"]);
    expect(rule.kind).toBe("text");
  });

  it("uses value_type when sort_as is auto", () => {
    expect(resolveSortRule({ sort_as: "auto", value_type: "date" }, ["x"]).kind).toBe("datetime");
    expect(resolveSortRule({ value_type: "number" }, ["x"]).kind).toBe("number");
  });

  it("sniffs when nothing is declared", () => {
    expect(resolveSortRule({ value_type: "auto" }, ["735MB", "1.6GB"]).kind).toBe("bytes");
  });

  it("carries order and null placement through", () => {
    const rule = resolveSortRule({ sort_order: ["a"], sort_nulls: "first" }, ["a"]);
    expect(rule.order).toEqual(["a"]);
    expect(rule.nulls).toBe("first");
  });
});

describe("sortNumber", () => {
  it("projects values onto the column scale for filters", () => {
    expect(sortNumber("1.6GB", "bytes")).toBe(1.6e9);
    expect(sortNumber("94.9%", "percent")).toBe(94.9);
    expect(sortNumber(42, "bytes")).toBe(42);
    expect(sortNumber("nope", "number")).toBeNull();
  });
});

describe("compareValues determinism", () => {
  it("returns 0 for equal values", () => {
    expect(compareValues("1GB", "1000MB", { kind: "bytes" })).toBe(0);
  });
});
