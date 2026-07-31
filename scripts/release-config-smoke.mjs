#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const readme = await readFile("README.md", "utf8");
const releaseWorkflow = await readFile(".github/workflows/release.yml", "utf8");
const releaseboxConfig = JSON.parse(await readFile("releasebox.config.json", "utf8"));

const documentsRegistryInstall = /\bnpm install (?:--global|-g) bugrepro\b/.test(readme);
const publishesPackage = /\bnpm publish\b/.test(releaseWorkflow);
const releaseboxPublishesPackage = releaseboxConfig.release?.publishNpm === true;
const usesProvenance = /\bnpm publish\b[^\n]*--provenance\b/.test(releaseWorkflow);
const usesTrustedPublishingClient =
  /\bnpm install (?:--global|-g) npm@(?:11|latest)\b/.test(releaseWorkflow);

const failures = [];

if (documentsRegistryInstall && !publishesPackage) {
  failures.push("README.md documents npm installation, but the release workflow does not publish to npm");
}

if (publishesPackage !== releaseboxPublishesPackage) {
  failures.push(
    `release workflow npm publishing (${publishesPackage}) does not match ` +
      `releasebox.config.json release.publishNpm (${releaseboxPublishesPackage})`,
  );
}

if (publishesPackage && !usesProvenance) {
  failures.push("the release workflow publishes to npm without provenance");
}

if (publishesPackage && !usesTrustedPublishingClient) {
  failures.push("the release workflow does not install an npm client with trusted publishing support");
}

if (failures.length > 0) {
  console.error("Release configuration smoke failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Release configuration smoke passed.");
