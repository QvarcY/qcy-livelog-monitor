# Changelog

All notable changes to QcY LiveLog Monitor are documented here.

The project follows semantic versioning where practical.

## [Unreleased]

Development after the first public release will be documented here.

## [1.0.0] - 2026-10-04

### Added

- Electron desktop application for Windows
- SSH server profiles
- SSH private-key authentication
- Optional OS-backed secure passphrase storage
- SSH host-key verification
- Remote access-log discovery
- Multi-project log collection
- Selective project monitoring
- Automatic reconnect support
- Log rotation handling
- Observed log-delay calculation
- Raw request view
- Smart activity grouping
- Human-like, Bot, Security, Server, Error and Unknown Smart layers
- 60-second live activity timeline
- Search with live session suggestions
- Project, Type and Status filters
- Pause / Resume without stopping collection
- On-demand Event Details drawer
- Dark and Light themes
- English and Latvian UI
- Focus mode
- Always-on-top option
- QvarcY branding and support links

### Security

- Passphrases are not stored in server profile JSON
- Remembered passphrases use Electron `safeStorage`
- Credential reads fail closed for malformed storage
- Credential writes use a temporary file before replacement
- Development Electron is prevented from registering itself for Windows login

### Notes

QcY v1.0 monitors one active SSH server profile at a time.

Smart activity is heuristic and should not be treated as identity verification.