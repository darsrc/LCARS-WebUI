import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

import Ajv2020 from "ajv/dist/2020.js";
import standaloneCode from "ajv/dist/standalone/index.js";
import { compile } from "json-schema-to-typescript";

const frontendRoot = resolve(import.meta.dirname, "..");
const schemaPath = resolve(frontendRoot, "../fixtures/golden/schema.v2.json");
const typesPath = resolve(frontendRoot, "src/types/contract.generated.ts");
const validatorPath = resolve(frontendRoot, "src/types/manifestValidator.generated.ts");
const checkOnly = process.argv.includes("--check");

const schemaText = await readFile(schemaPath, "utf8");
const schema = JSON.parse(schemaText);
const schemaHash = createHash("sha256").update(schemaText).digest("hex");
const banner = `/* Generated from fixtures/golden/schema.v2.json. SHA256: ${schemaHash}. Do not edit. */`;

const schemaForTypes = structuredClone(schema);
const schemaValueKeys = [
  "additionalProperties",
  "contains",
  "else",
  "if",
  "items",
  "not",
  "propertyNames",
  "then",
  "unevaluatedItems",
  "unevaluatedProperties",
];
const schemaMapKeys = [
  "$defs",
  "definitions",
  "dependentSchemas",
  "patternProperties",
  "properties",
];
const schemaListKeys = ["allOf", "anyOf", "oneOf", "prefixItems"];

function correctTypelessSchemas(node) {
  if (node === true || node === false || node === null || typeof node !== "object") return;

  const constrainingKeys = [
    "type",
    "$ref",
    "anyOf",
    "allOf",
    "oneOf",
    "properties",
    "enum",
    "const",
  ];
  if (Object.keys(node).length > 0 && !constrainingKeys.some((key) => Object.hasOwn(node, key))) {
    // json-schema-to-typescript turns annotated, typeless schemas into object
    // index signatures. They actually accept every JSON value, including
    // primitives, so use its override to emit an honest unknown type alias.
    node.tsType = "unknown";
  }

  for (const key of schemaValueKeys) correctTypelessSchemas(node[key]);
  for (const key of schemaMapKeys) {
    for (const child of Object.values(node[key] ?? {})) correctTypelessSchemas(child);
  }
  for (const key of schemaListKeys) {
    for (const child of node[key] ?? []) correctTypelessSchemas(child);
  }
}

correctTypelessSchemas(schemaForTypes);

const types = await compile(schemaForTypes, "GeneratedManifest", {
  additionalProperties: false,
  bannerComment: banner,
  format: true,
  style: {
    bracketSpacing: true,
    printWidth: 100,
    semi: true,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: "all",
    useTabs: false,
  },
});

const ajv = new Ajv2020({
  allErrors: false,
  code: { esm: true, lines: false, optimize: 2, source: true },
  strict: false,
});
const validate = ajv.compile(schema);
const validator = `${banner}\n// @ts-nocheck\n${standaloneCode(ajv, validate)}\n`;

const outputs = [
  [typesPath, types],
  [validatorPath, validator],
];

if (checkOnly) {
  let stale = false;
  for (const [path, expected] of outputs) {
    const actual = await readFile(path, "utf8").catch(() => "");
    if (actual !== expected) {
      stale = true;
      process.stderr.write(`${path} is stale; run: make contracts-update\n`);
    }
  }
  process.exitCode = stale ? 1 : 0;
} else {
  for (const [path, content] of outputs) {
    await writeFile(path, content, "utf8");
  }
  process.stdout.write("Generated TypeScript contract and standalone manifest validator.\n");
}
