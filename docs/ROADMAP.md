# Roadmap

## Phase 0 — Collector proof of concept

- [x] SSH connection
- [x] encrypted private key support
- [x] `tail -F` stream
- [x] Apache access log parser
- [x] basic event classification
- [x] validate against live AREA logs

## Phase 1 — Multi-project collector

- discover available `*-ssl_log` files
- monitor multiple projects
- reconnect automatically
- detect log rotation
- normalize project names
- calculate observed hosting log delay

## Phase 2 — Desktop application

- Electron shell
- project sidebar
- live event table
- filters
- search
- pause/resume
- connection status
- event detail drawer

## Phase 3 — Diagnostics

- scanner detection
- bot detection
- HTTP status summaries
- IP activity view
- session reconstruction
- unusual User-Agent detection
- greeting detection

## Phase 4 — History

- local SQLite storage
- retention controls
- statistics
- historical search
- export

## Phase 5 — Packaging

- Windows installer
- secure local credential handling
- automatic updates
- settings UI