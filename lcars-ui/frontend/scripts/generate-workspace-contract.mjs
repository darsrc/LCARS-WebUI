import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

import Ajv2020 from "ajv/dist/2020.js";
import standaloneCode from "ajv/dist/standalone/index.js";
import { compile } from "json-schema-to-typescript";

import { esmifyStandaloneAjvCode } from "./lib/esmifyStandaloneAjv.mjs";

const frontendRoot = resolve(import.meta.dirname, "..");
const schemaPath = resolve(frontendRoot, "../fixtures/golden/workspace.v1.schema.json");
const typesPath = resolve(frontendRoot, "src/types/workspace.generated.ts");
const validatorPath = resolve(frontendRoot, "src/types/workspaceValidator.generated.ts");
const checkOnly = process.argv.includes("--check");

const schemaText = await readFile(schemaPath, "utf8");
const schema = JSON.parse(schemaText);
const schemaHash = createHash("sha256").update(schemaText).digest("hex");
const banner = `/* Generated from fixtures/golden/workspace.v1.schema.json. SHA256: ${schemaHash}. Do not edit. */`;

const types = await compile(schema, "GeneratedWorkspaceWireMessage", {
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
const validator = `${banner}\n// @ts-nocheck\n${esmifyStandaloneAjvCode(standaloneCode(ajv, validate))}\n`;

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
  process.stdout.write("Generated TypeScript workspace contract and validator.\n");
}
