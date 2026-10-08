const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const readJson = (name) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, name), "utf8"));

const firefox = readJson("manifest.json");
const chrome = readJson("manifest.chrome.json");

// Keys that must stay identical so the two builds cannot drift apart.
const SHARED_KEYS = [
  "manifest_version",
  "name",
  "version",
  "description",
  "host_permissions",
  "action",
  "content_scripts",
];

test("Firefox and Chrome manifests agree on everything shared", () => {
  for (const key of SHARED_KEYS) {
    assert.deepEqual(chrome[key], firefox[key], `"${key}" differs`);
  }
});

test("each manifest uses its browser's background mechanism", () => {
  assert.deepEqual(firefox.background, { scripts: ["background.js"] });
  assert.deepEqual(chrome.background, { service_worker: "background.js" });
  assert.equal(chrome.browser_specific_settings, undefined);
});

test("every file a manifest references exists", () => {
  const files = [
    ...firefox.background.scripts,
    chrome.background.service_worker,
    ...firefox.content_scripts.flatMap((entry) => entry.js),
  ];
  for (const file of files) {
    assert.ok(fs.existsSync(path.join(ROOT, file)), `${file} is missing`);
  }
});
