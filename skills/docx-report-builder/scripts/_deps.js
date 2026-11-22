// Resolve npm packages from wherever they are installed, so the skill works
// whether it lives in ~/.claude/skills, ~/.gemini/config/skills, ~/.agents/skills
// or inside a project. Lookup order:
//   1. normal Node resolution from this file (skill folder, NODE_PATH)
//   2. the current working directory's node_modules (the user's project)
//   3. the global npm root (`npm root -g`)
const path = require("path");
const { createRequire } = require("module");
const { execSync } = require("child_process");

let globalRoot;
function npmGlobalRoot() {
  if (globalRoot !== undefined) return globalRoot;
  try {
    globalRoot = execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    globalRoot = null;
  }
  return globalRoot;
}

function requireDep(name) {
  const tries = [
    () => require(name),
    () => createRequire(path.join(process.cwd(), "noop.js"))(name),
    () => {
      const root = npmGlobalRoot();
      if (!root) throw new Error("no global npm root");
      return createRequire(path.join(root, "noop.js"))(name);
    },
  ];
  for (const t of tries) {
    try {
      return t();
    } catch (e) {
      if (e && e.code && e.code !== "MODULE_NOT_FOUND" && e.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") throw e;
    }
  }
  const err = new Error(
    `Missing npm package "${name}". Install it in the project (npm install ${name}) ` +
      `or globally (npm install -g ${name}). Run scripts/check_deps.js for the full list.`
  );
  err.code = "MODULE_NOT_FOUND";
  throw err;
}

// jszip ships inside pptxgenjs; fall back to that copy if it is not installed on its own.
function requireJSZip() {
  try {
    return requireDep("jszip");
  } catch {
    const pptxMain = (() => {
      for (const base of [__dirname, process.cwd(), npmGlobalRoot()].filter(Boolean)) {
        try {
          return createRequire(path.join(base, "noop.js")).resolve("pptxgenjs");
        } catch {}
      }
      return null;
    })();
    if (!pptxMain) throw new Error('Missing npm package "jszip" (or "pptxgenjs", which bundles it).');
    return createRequire(pptxMain)("jszip");
  }
}

// Minimal read-only ZIP reader (stored + deflate) using only Node built-ins.
// Enough for .docx/.pptx/.xlsx files. Returns { names, read(name) -> Buffer | null }.
function readZip(buf) {
  const zlib = require("zlib");
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Not a ZIP file (no end-of-central-directory record)");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let k = 0; k < count; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Corrupt ZIP central directory");
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString("utf8");
    entries.set(name, { method, compSize, local });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return {
    names: [...entries.keys()],
    read(name) {
      const e = entries.get(name);
      if (!e) return null;
      const start = e.local + 30 + buf.readUInt16LE(e.local + 26) + buf.readUInt16LE(e.local + 28);
      const data = buf.slice(start, start + e.compSize);
      if (e.method === 0) return data;
      if (e.method === 8) return zlib.inflateRawSync(data);
      throw new Error(`Unsupported ZIP compression method ${e.method} for ${name}`);
    },
  };
}

module.exports = { requireDep, requireJSZip, readZip };
