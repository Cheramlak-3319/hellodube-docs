const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");

const MASTER_PATH = path.join(__dirname, "../openapi/master.yaml");
const OUTPUT_DIR = path.join(__dirname, "../openapi");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Load master spec
const master = yaml.load(fs.readFileSync(MASTER_PATH, "utf8"));

/**
 * Filter OpenAPI object by allowed roles and optionally HTTP methods.
 * @param {string[]} allowedRoles - Roles that should see these operations
 * @param {string[]} [allowedMethods] - HTTP methods to include (e.g. ['GET']). null = all methods
 */
function filterSpec(allowedRoles, allowedMethods = null) {
  const clone = JSON.parse(JSON.stringify(master));
  const filteredPaths = {};

  for (const [path, operations] of Object.entries(clone.paths)) {
    const filteredOps = {};
    for (const [method, operation] of Object.entries(operations)) {
      const opRoles = operation["x-roles"] || [];
      const matchesRole = allowedRoles.some((role) => opRoles.includes(role));
      const matchesMethod = allowedMethods
        ? allowedMethods
            .map((m) => m.toLowerCase())
            .includes(method.toLowerCase())
        : true;
      if (matchesRole && matchesMethod) {
        filteredOps[method] = operation;
      }
    }
    if (Object.keys(filteredOps).length > 0) {
      filteredPaths[path] = filteredOps;
    }
  }

  clone.paths = filteredPaths;
  return clone;
}

// Generate the four specs
const dubeFull = filterSpec(["dube-admin", "dube-viewer"]);
const dubeReadOnly = filterSpec(["dube-viewer"], ["GET"]);
const wfpFull = filterSpec(["wfp-admin", "wfp-viewer"]);
const wfpReadOnly = filterSpec(["wfp-viewer"], ["GET"]);

// Write files
fs.writeFileSync(
  path.join(OUTPUT_DIR, "dube-full.yaml"),
  yaml.dump(dubeFull, { lineWidth: -1 }),
);
fs.writeFileSync(
  path.join(OUTPUT_DIR, "dube-readonly.yaml"),
  yaml.dump(dubeReadOnly, { lineWidth: -1 }),
);
fs.writeFileSync(
  path.join(OUTPUT_DIR, "wfp-full.yaml"),
  yaml.dump(wfpFull, { lineWidth: -1 }),
);
fs.writeFileSync(
  path.join(OUTPUT_DIR, "wfp-readonly.yaml"),
  yaml.dump(wfpReadOnly, { lineWidth: -1 }),
);

console.log("✅ 4 OpenAPI files generated in /openapi");
