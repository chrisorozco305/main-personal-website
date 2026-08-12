import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generate, latestPostTeaser } from "./scripts/blog.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolves <!--#include partials/x.html--> in index.html the same way
 * scripts/blog.mjs does for generated blog pages, so the homepage and blog
 * pages share one header/footer/background source instead of copy-pasted
 * markup drifting apart.
 */
function includePartials(html) {
  return html.replace(/<!--#include\s+([^\s>]+)\s*-->/g, (_m, file) => {
    const target = path.join(root, file);
    return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  });
}

function blogPlugin() {
  return {
    name: "markdown-blog",
    // Build/dev entry points are read before the config's `build.rollupOptions.input`
    // is resolved, so pages must exist on disk before Vite (and Rollup) scan for them.
    buildStart() {
      generate(root);
    },
    configureServer(server) {
      generate(root);
      const postsDir = path.join(root, "blog", "posts");
      server.watcher.add(postsDir);
      server.watcher.on("change", (file) => {
        if (file.startsWith(postsDir)) {
          generate(root);
          server.ws.send({ type: "full-reload" });
        }
      });
    },
    transformIndexHtml(html) {
      return includePartials(html)
        .replace("<!--#latest-post-->", latestPostTeaser(root))
        // Same tokens scripts/blog.mjs fills with blog-specific values on
        // generated pages.
        .replace(/\{\{navLabel\}\}/g, "projects")
        .replace(/\{\{navHref\}\}/g, "/")
        .replace(
          /\{\{footerTagline\}\}/g,
          "B.A. Computer Science, 2+ years of game development experience"
        );
    },
  };
}

function findHtmlInputs() {
  const inputs = { main: path.resolve(root, "index.html") };
  const blogDir = path.join(root, "blog");
  if (!fs.existsSync(blogDir)) return inputs;

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "index.html") {
        const key = path.relative(root, full).replace(/[\\/]/g, "-").replace(/\.html$/, "");
        inputs[key] = full;
      }
    }
  };
  walk(blogDir);
  return inputs;
}

export default defineConfig(() => {
  // Generate once up front so build.rollupOptions.input (evaluated at config
  // time, before buildStart runs) can see the post pages that don't exist yet.
  generate(root);

  return {
    plugins: [blogPlugin()],
    build: {
      rollupOptions: {
        input: findHtmlInputs(),
      },
    },
  };
});
