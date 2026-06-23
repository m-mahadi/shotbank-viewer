// Build the offline Android APK: bundle docs/ into the app's assets, inline the
// shot manifest as a window.__SHOTS__ global (fetch() is blocked on file://),
// then run gradle. Run after build-shots.mjs. ponytail: node copy + one regex.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = "D:/shotbank-inspo";
const DOCS = path.join(ROOT, "docs");
const ASSETS = path.join(ROOT, "android/app/src/main/assets");

fs.rmSync(ASSETS, { recursive: true, force: true });
fs.cpSync(DOCS, ASSETS, { recursive: true });

// inline the manifest so no fetch/XHR is needed on file://
const shots = fs.readFileSync(path.join(DOCS, "shots.json"), "utf8");
fs.writeFileSync(path.join(ASSETS, "shots-data.js"), `window.__SHOTS__=${shots};\n`);

// load shots-data.js before app.js in the bundled index
const indexPath = path.join(ASSETS, "index.html");
let html = fs.readFileSync(indexPath, "utf8");
if (!html.includes("shots-data.js")) {
  html = html.replace('<script src="app.js"></script>', '<script src="shots-data.js"></script>\n  <script src="app.js"></script>');
  fs.writeFileSync(indexPath, html);
}
console.log(`bundled ${fs.readdirSync(path.join(ASSETS, "shots")).length} shots into assets`);

const env = {
  ...process.env,
  ANDROID_HOME: path.join(process.env.USERPROFILE, "AppData/Local/Android/Sdk"),
  ANDROID_SDK_ROOT: path.join(process.env.USERPROFILE, "AppData/Local/Android/Sdk"),
};
execSync("gradlew.bat assembleDebug --no-daemon", { cwd: path.join(ROOT, "android"), env, stdio: "inherit" });
console.log("\nAPK: android/app/build/outputs/apk/debug/app-debug.apk");
