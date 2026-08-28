import {
  PROTOCOL_VERSION,
  makeActionEnvelope,
  makeFormSubmitEnvelope,
  makeInputEnvelope,
  parseEnvelope,
} from "./protocol";

describe("protocol v2 envelope parsing", () => {
  test("PROTOCOL_VERSION is 2.0", () => {
    expect(PROTOCOL_VERSION).toBe("2.0");
  });

  test("accepts an envelope with no v field at all", () => {
    const envelope = parseEnvelope({ type: "notification", payload: { message: "hi", level: "info" } });
    expect(envelope.type).toBe("notification");
  });

  test("accepts an envelope stamped with the current protocol version", () => {
    const envelope = parseEnvelope({
      v: "2.0",
      type: "session_hydration",
      payload: { manifest: {} },
    });
    expect(envelope.type).toBe("session_hydration");
    expect(envelope.v).toBe("2.0");
  });

  test("accepts a log_snapshot envelope", () => {
    const envelope = parseEnvelope({
      v: "2.0",
      type: "log_snapshot",
      payload: { stream_id: "ops", lines: ["a", "b"] },
    });
    expect(envelope.type).toBe("log_snapshot");
  });

  test("rejects a mismatched protocol version with a clear error naming both versions", () => {
    expect(() =>
      parseEnvelope({ v: "1.0", type: "notification", payload: { message: "hi", level: "info" } }),
    ).toThrow(/1\.0.*2\.0|Unsupported protocol version/);
  });

  test("rejects an unknown future protocol version", () => {
    expect(() =>
      parseEnvelope({ v: "3.0", type: "notification", payload: { message: "hi", level: "info" } }),
    ).toThrow();
  });

  test("rejects an unknown envelope type", () => {
    expect(() => parseEnvelope({ type: "not_a_real_type", payload: {} })).toThrow(
      "Envelope type is invalid",
    );
  });

  test("rejects a payload-less envelope", () => {
    expect(() => parseEnvelope({ type: "notification" })).toThrow("Envelope payload is required");
  });

  test("upstream envelope factories stamp the current protocol version", () => {
    expect(makeActionEnvelope("btn", true).v).toBe(PROTOCOL_VERSION);
    expect(makeInputEnvelope("field", "x").v).toBe(PROTOCOL_VERSION);
    expect(makeFormSubmitEnvelope("form", { a: 1 }).v).toBe(PROTOCOL_VERSION);
  });
});
