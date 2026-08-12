---
title: "Rebuilding this site: a list layout, a real blog, and a lazier video player"
date: "2026-08-11"
tags: ["meta", "performance", "vite"]
excerpt: "Notes on restructuring the portfolio into a project list plus a markdown-powered blog, and fixing the autoplay-everything problem that was making media-heavy pages slow."
---

I rebuilt the structure of this site from a card grid into a single scrolling
list of projects, and added this blog on top of it. Both were generated from
plain markdown files at build time — no server, no database, just static
HTML that Vite assembles.

## Why a list instead of a grid

A grid is great for scanning many small things at once. A list reads better
when each entry has something to say — a status, a stack, a couple of links.
Every entry gets the same shape: title, status badge, description, tags,
links, and an optional piece of media on the side.

## The media problem

Looping background video is an easy way to make a portfolio feel alive, but
it's also an easy way to make it slow — five autoplaying videos competing for
decode time will jank a page on modest hardware, especially if every one of
them starts downloading before you've scrolled to see any of them.

The fix here is boring on purpose:

- Videos start with no `src` at all.
- An `IntersectionObserver` attaches the real source only once a card enters
  the viewport.
- Playback pauses — and the decoder releases — the moment the card scrolls
  out of view.
- A small concurrency cap keeps more than a couple of videos from ever
  decoding at once, regardless of how many are technically "visible."
- `prefers-reduced-motion` and `navigator.connection.saveData` skip video
  entirely in favor of a static poster frame.

None of that requires giving up the loop — it just stops paying for loops
nobody's looking at yet.

## What's next

More real project write-ups, and probably a proper reading-time estimate
once there's enough content on this blog to make one meaningful.
