#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const readme = await readFile("README.md", "utf8");
const releaseWorkflow = await readFile(".github/workflows/release.yml", "utf8");

const documentsRegistryInstall = /\bnpm install (?:--global|-g) bugrepro\b/.test(readme);
const publishesPackage = /\bnpm publish\b/.test(releaseWorkflow);
const usesProvenance = /\bnpm publish\b[^\n]*--provenance\b/.test(releaseWorkflow);

const failures = [];

if (documentsRegistryInstall && !publishesPackage) {
  failures.push("README.md documents npm installation, but the release workflow does not publish to npm");
}

if (publishesPackage && !usesProvenance) {
  failures.push("the release workflow publishes to npm without provenance");
}

if (failures.length > 0) {
  console.error("Release configuration smoke failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Release configuration smoke passed.");
