# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Logseq plugin that registers a `/⟁ SecureChat` slash command. When invoked, it recursively extracts content from the current block tree and sends it to the Prisme.ai SecureChat webhook API for summarization. Early stage (v0.0.1) — response handling is incomplete (logged to console only, not yet inserted back into Logseq).

## Architecture

- **No build system** — plain JavaScript served directly to Logseq's plugin runtime
- **No dependencies in package.json** — `@logseq/libs` is loaded via CDN in `index.html`
- **Two files matter:** `index.html` (entry point, loads CDN + script) and `index.js` (all logic)

### index.js structure

- `main()` — registers the slash command via `logseq.Editor.registerSlashCommand`, fetches parent block content, calls Prisme.ai API
- `getContentRecursive(block)` — builds indented markdown list from block tree
- `walkBlock(block, level, callback)` — recursive tree walker resolving Logseq UUID child references
- Bootstrap: `logseq.ready(main)`

### Configuration

Plugin settings (configured via Logseq → Plugins → SecureChat gear icon):
- **webhookUrl** — Prisme.ai SecureChat webhook endpoint URL
- **projectId** — Prisme.ai project identifier
- **apiKey** — Prisme.ai API key

Defined via `logseq.useSettingsSchema()` in `main()`. Accessed at runtime via `logseq.settings`.

### API integration

The plugin POSTs to the configured webhook URL with `projectId`, `apiKey`, and `prompt` fields.

## Development

No npm scripts, no tests, no linting configured. To develop:

1. Load as a local Logseq plugin (Logseq → Plugins → Load unpacked plugin → select this directory)
2. Edit `index.js` and reload the plugin in Logseq to test changes
3. Use browser dev console (Logseq is Electron) to see `console.log` output

## Key Logseq Plugin APIs Used

- `logseq.Editor.registerSlashCommand` — register slash commands
- `logseq.Editor.getCurrentBlock` / `getBlock` — read block tree
- `logseq.App.showMsg` — display hiccup-formatted notifications
- `logseq.useSettingsSchema` / `logseq.settings` — plugin settings UI and access
