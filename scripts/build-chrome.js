// Assembles the Chrome build in dist/chrome: the shared source plus the
// Chrome manifest. The repository root is itself the Firefox build.
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "dist", "chrome");
const SHARED_PATHS = ["background.js", "content", "LICENSE"];
const CHROME_MANIFEST = "manifest.chrome.json";

function build() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const relative of SHARED_PATHS) {
    fs.cpSync(path.join(ROOT, relative), path.join(OUT_DIR, relative), {
      recursive: true,
    });
  }
  fs.copyFileSync(
    path.join(ROOT, CHROME_MANIFEST),
    path.join(OUT_DIR, "manifest.json")
  );
}

try {
  build();
  console.log(`Chrome build written to ${path.relative(process.cwd(), OUT_DIR)}`);
} catch (error) {
  console.error(`Chrome build failed: ${error.message}`);
  process.exitCode = 1;
}
