# QcY LiveLog Monitor Roadmap

This roadmap describes likely development directions after the first public release.

It is not a promise of delivery dates.

## v1.0 — First public release

Core release scope:

- [x] Electron desktop shell
- [x] SSH server profiles
- [x] secure remembered passphrases
- [x] SSH host-key verification
- [x] remote log discovery
- [x] multi-project collection
- [x] selective project monitoring
- [x] reconnect handling
- [x] log rotation handling
- [x] observed log delay
- [x] Raw request view
- [x] Smart activity grouping
- [x] activity layers
- [x] live search and suggestions
- [x] Project / Type / Status filters
- [x] Pause / Resume
- [x] 60-second activity timeline
- [x] Event Details drawer
- [x] English / Latvian UI
- [x] Dark / Light themes

## v1.1 candidates

Potential next release work:

- simultaneous monitoring of multiple SSH server profiles;
- persistent local activity history;
- stale / dormant log-source detection;
- last-seen activity per project;
- improved project/domain grouping;
- configurable history retention;
- more complete empty / offline / reconnect states;
- packaging and updater improvements.

## Later candidates

Longer-term ideas:

- additional access-log formats;
- pluggable parser profiles;
- richer security-probe analysis;
- local statistics and trends;
- export of filtered sessions;
- reusable saved filters;
- project aliases;
- optional notification rules;
- Linux/macOS packaging if the desktop stack is validated there.

## Non-goals for now

QcY is not intended to become:

- a SIEM platform;
- a cloud log-ingestion service;
- a replacement for full observability stacks;
- an identity-verification system.

The project should remain useful as a lightweight local SSH log monitor.