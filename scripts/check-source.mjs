import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
const globals = new Set([
  "queueMicrotask",
  "undefined",
  "console",
  "window",
  "document",
  "navigator",
  "localStorage",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "ResizeObserver",
  "MutationObserver",
  "performance",
  "URL",
  "URLSearchParams",
  "Blob",
  "fetch",
  "AbortController",
  "Event",
  "CustomEvent",
]);
let failures = 0;
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".jsx")) {
      const ast = parse(fs.readFileSync(p, "utf8"), {
        sourceType: "module",
        plugins: ["jsx"],
      });
      const missing = new Set();
      traverse(ast, {
        ReferencedIdentifier(q) {
          if (!q.scope.hasBinding(q.node.name) && !globals.has(q.node.name))
            missing.add(q.node.name);
        },
        JSXOpeningElement(q) {
          let n = q.node.name;
          while (n.type === "JSXMemberExpression") n = n.object;
          if (/^[A-Z]/.test(n.name) && !q.scope.hasBinding(n.name))
            missing.add(n.name);
        },
      });
      if (missing.size) {
        console.log(p, [...missing]);
        failures++;
      }
    }
  }
}
walk("src");
process.exitCode = failures ? 1 : 0;
