#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const readme = await readFile("README.md", "utf8");
const changelog = await readFile("CHANGELOG.md", "utf8");
const releaseWorkflow = await readFile(".github/workflows/release.yml", "utf8");
const releaseboxConfig = JSON.parse(await readFile("releasebox.config.json", "utf8"));

const documentsRegistryInstall = /\bnpm install (?:--global|-g) bugrepro\b/.test(readme);
const publishesPackage = /\bnpm publish\b/.test(releaseWorkflow);
const releaseboxPublishesPackage = releaseboxConfig.release?.publishNpm === true;
const usesProvenance = /\bnpm publish\b[^\n]*--provenance\b/.test(releaseWorkflow);
const usesTrustedPublishingClient =
  /\bnpm install (?:--global|-g) npm@(?:11|latest)\b/.test(releaseWorkflow);
const isBeforeFirstRelease = /compare\/\.\.\.HEAD/.test(changelog);
const documentsUnpublishedState = /not yet published|no public npm release yet/i.test(readme);
const sourceCommands = ["npm ci", "npm run build", "node dist/cli.js --help"];
const sourceCommandOffsets = sourceCommands.map((command) => readme.indexOf(command));
const documentsSourceInstall = sourceCommandOffsets.every(
  (offset, index) => offset >= 0 && (index === 0 || offset > sourceCommandOffsets[index - 1]),
);

const failures = [];

if (documentsRegistryInstall && !publishesPackage) {
  failures.push("README.md documents npm installation, but the release workflow does not publish to npm");
}

if (isBeforeFirstRelease && documentsRegistryInstall) {
  failures.push("README.md documents a registry install before the first release exists");
}

if (isBeforeFirstRelease && !documentsUnpublishedState) {
  failures.push("README.md does not clearly identify the package as not yet published");
}

if (isBeforeFirstRelease && !documentsSourceInstall) {
  failures.push("README.md does not document the executable npm ci/build/source CLI workflow");
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
