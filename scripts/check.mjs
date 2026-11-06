import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const required = ["schemaVersion", "id", "name", "version", "main", "renderer"];
for (const key of required) {
  if (!(key in manifest)) throw new Error(`missing manifest.${key}`);
}
if (manifest.permissions?.includes("renderer.extension") !== true) throw new Error("renderer.extension permission missing");
if (!manifest.rendererActions?.includes("plugin.call")) throw new Error("plugin.call action missing");
if (!manifest.rendererCallMethods?.includes("getUsage")) throw new Error("getUsage method missing");
for (const file of [manifest.main, manifest.renderer, "lib/usage.mjs", "scripts/usage.test.mjs"]) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`missing ${file}`);
}
console.log("PASS: manifest and plugin files are present");
