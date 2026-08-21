import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolves <!--#include partials/x.html--> in index.html so the header,
 * footer, and background aren't copy-pasted markup.
 */
function includePartials(html) {
  return html.replace(/<!--#include\s+([^\s>]+)\s*-->/g, (_m, file) => {
    const target = path.join(root, file);
    return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  });
}

function sitePlugin() {
  return {
    name: "site",
    transformIndexHtml(html) {
      return includePartials(html)
        .replace(/\{\{navLabel\}\}/g, "projects")
        .replace(/\{\{navHref\}\}/g, "/")
        .replace(
          /\{\{footerTagline\}\}/g,
          "B.A. Computer Science · Miami, FL"
        );
    },
  };
}

export default defineConfig({
  plugins: [sitePlugin()],
});
