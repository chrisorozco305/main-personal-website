// Turns blog/posts/*.md into static HTML pages.
//
// Called from vite.config.js at config time (so Rollup can see the generated
// pages as build inputs) and again whenever a .md file changes in dev.
//
// Output layout mirrors the URL scheme:
//   blog/index.html                  -> /blog/
//   blog/<date>/<slug>/index.html    -> /blog/<date>/<slug>/
//
// Everything it writes is generated, never hand-edited, and gitignored.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const POSTS_DIR = "blog/posts";

/** YAML turns unquoted dates into Date objects — read them back as UTC so the
 *  day never shifts for anyone west of Greenwich. */
function toISODate(value, fallback) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return fallback;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** First paragraph of the body, stripped to plain text, for the index excerpt. */
function autoExcerpt(markdown, limit = 180) {
  const firstPara = markdown
    .replace(/^#.*$/gm, "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p.length > 0);
  if (!firstPara) return "";
  const text = firstPara
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

/** The post's own body, flattened to one plain-text run for the index preview —
 *  paragraphs join together rather than stopping at the first one, so a row
 *  shows the actual opening of the writing instead of a summary of it.
 *  260 characters including the ellipsis, cut wherever it lands rather than at a
 *  word boundary, matching the reference. */
function bodyPreview(markdown, limit = 259) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#.*$/gm, " ")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

export function readPosts(root) {
  const dir = path.join(root, POSTS_DIR);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      const slug = data.slug || file.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
      const date = toISODate(data.date, file.slice(0, 10));

      return {
        title: data.title || slug,
        date,
        slug,
        tags: Array.isArray(data.tags) ? data.tags : [],
        // excerpt is the authored summary — it feeds <meta name="description">
        // and the homepage teaser. preview is the body itself, for index rows.
        excerpt: data.excerpt || autoExcerpt(content),
        preview: bodyPreview(content),
        body: marked.parse(content),
        url: `/blog/${date}/${slug}/`,
      };
    })
    .sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date)));
}

/** Resolve <!--#include path--> recursively so partials can nest. */
function applyIncludes(html, root, depth = 0) {
  if (depth > 5) return html;
  const resolved = html.replace(/<!--#include\s+([^\s>]+)\s*-->/g, (_m, file) => {
    const target = path.join(root, file);
    return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  });
  return resolved === html ? html : applyIncludes(resolved, root, depth + 1);
}

function fill(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : ""
  );
}

/** Archive links at the foot of a post: older on the left, newer on the right.
 *  Either side is absent at the ends of the archive — CSS keeps the survivor on
 *  its own edge, so no placeholder element is needed to hold the gap. */
function postNav(older, newer) {
  if (!older && !newer) return "";
  const prev = older
    ? `        <a class="post-nav-link post-nav-prev" href="${older.url}" rel="prev">← ${escapeHtml(older.title)}</a>\n`
    : "";
  const next = newer
    ? `        <a class="post-nav-link post-nav-next" href="${newer.url}" rel="next">${escapeHtml(newer.title)} →</a>\n`
    : "";
  return `      <nav class="post-nav" aria-label="More posts">\n${prev}${next}      </nav>`;
}

/** One row of the blog index: stacked title / date / body preview. Tags are parsed
 *  from frontmatter but no longer rendered anywhere — neither the index nor the
 *  post page shows them, so both read as title / date / prose. */
export function postRow(post) {
  return `        <li class="post-row reveal">
          <a class="post-link" href="${post.url}">
            <h3 class="post-title">${escapeHtml(post.title)}</h3>
          </a>
          <time class="post-date" datetime="${post.date}">${post.date}</time>
          <p class="post-excerpt">${escapeHtml(post.preview)}</p>
        </li>`;
}

/** "Latest from the blog" teaser block, injected into the homepage above
 * the project grid via the <!--#latest-post--> token (see vite.config.js). */
export function latestPostTeaser(root) {
  const posts = readPosts(root);
  if (!posts.length) return "";
  const post = posts[0];
  return `    <a class="blog-teaser reveal" href="${post.url}">
      <span class="blog-teaser-kicker">Latest from the blog</span>
      <span class="blog-teaser-title">${escapeHtml(post.title)}</span><span class="blog-teaser-date">${post.date}</span>
      <p class="blog-teaser-excerpt">${escapeHtml(post.excerpt)}</p>
      <span class="blog-teaser-cta">Read post →</span>
    </a>`;
}

/**
 * Remove previously generated output so deleted, renamed, or (as happened
 * once) mis-pathed posts don't linger. Sweeps everything under blog/ except
 * the posts/ source directory, rather than only entries matching the
 * expected date-folder shape — a narrower check silently missed stray output
 * from an earlier path bug.
 */
function clean(root) {
  const blogDir = path.join(root, "blog");
  if (!fs.existsSync(blogDir)) return;
  for (const entry of fs.readdirSync(blogDir)) {
    if (entry === "posts") continue;
    fs.rmSync(path.join(blogDir, entry), { recursive: true, force: true });
  }
}

export function generate(root) {
  const layout = fs.readFileSync(path.join(root, "partials", "layout.html"), "utf8");
  const posts = readPosts(root);
  const written = [];

  clean(root);

  // Partials are inlined *before* tokens are filled, so placeholders that live
  // inside a partial ({{navLabel}} in header.html) get substituted too. Values
  // are injected via String.replace callbacks and never rescanned, so post
  // bodies containing {{...}} pass through untouched.
  const page = applyIncludes(layout, root);

  const write = (relPath, vars) => {
    const full = path.join(root, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, fill(page, vars), "utf8");
    written.push(full);
  };

  // ---- index ----
  const rows = posts.length
    ? `<ul class="post-list">\n${posts.map(postRow).join("\n")}\n      </ul>`
    : `<p class="empty">No posts yet — drop a markdown file in <code>blog/posts/</code>.</p>`;

  write("blog/index.html", {
    title: "Blog — Christian Orozco",
    description: "Writing on software, side projects, and things worth building.",
    bodyClass: "page-blog",
    navLabel: "blog",
    navHref: "/blog/",
    footerTagline: "Software Engineer | Game Developer",
    content: `    <section class="blog-index">
      ${rows}
    </section>`,
  });

  // ---- one page per post ----
  // posts is sorted newest-first, so the entry *after* this one in the array is
  // the older post and the entry before it is the newer one.
  for (const [i, post] of posts.entries()) {
    const older = posts[i + 1];
    const newer = posts[i - 1];
    // post.url is already "/blog/<date>/<slug>/" — strip the leading slash
    // rather than prefixing "blog" again (that produced blog/blog/... nesting).
    write(`${post.url.slice(1)}index.html`, {
      title: `${post.title} — Christian Orozco`,
      description: post.excerpt,
      bodyClass: "page-post",
      navLabel: "blog",
    navHref: "/blog/",
    footerTagline: "Software Engineer | Game Developer",
      content: `    <article class="post">
      <header class="post-header">
        <a class="back-link" href="/blog/">← Back to blog</a>
        <h1>${escapeHtml(post.title)}</h1>
        <time class="post-date" datetime="${post.date}">${post.date}</time>
      </header>
      <div class="prose">
${post.body}
      </div>
${postNav(older, newer)}
    </article>`,
    });
  }

  return { posts, pages: written.filter((f) => f.endsWith(".html")) };
}
