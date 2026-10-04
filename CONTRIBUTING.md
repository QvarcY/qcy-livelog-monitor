# Contributing to QcY LiveLog Monitor

Thank you for considering a contribution.

QcY aims to remain a small, understandable desktop monitoring tool. Changes should improve reliability, usability or maintainability without unnecessarily increasing complexity.

## Before starting

For larger features, open an issue first so the intended behaviour can be discussed.

Small bug fixes can go directly to a pull request when the problem and solution are clear.

## Development setup

```powershell
git clone https://github.com/QvarcY/qcy-livelog-monitor.git
cd qcy-livelog-monitor
npm ci
```

Run the desktop application:

```powershell
npm run desktop
```

## Required checks

Before submitting a pull request:

```powershell
npm run typecheck
npm run build

node .\scripts\test-activity-grouping.mjs
node .\scripts\test-smart-activity.mjs
node .\scripts\test-project-monitoring.mjs

git diff --check
```

All checks should pass.

## Pull requests

Please keep pull requests focused.

A good pull request explains:

- the problem;
- the change;
- why the change is needed;
- how it was tested;
- any user-visible behaviour change.

Avoid unrelated formatting or generated-file changes.

## Security and privacy

Never commit:

- SSH private keys
- passphrases
- passwords
- access tokens
- unredacted production access logs
- private customer information

Use example domains and RFC 5737 documentation IP ranges in tests and documentation.

## UI changes

For visible UI changes, screenshots are welcome.

Please test both:

- Dark theme
- Light theme

When practical, also verify English and Latvian UI text.

## Smart classification

Smart activity is heuristic.

Changes to grouping or classification should include regression coverage and should avoid presenting heuristic classifications as certainty.

In particular, `Human-like` must not be treated as proof of a real human identity.

## Commit style

Short conventional-style commit subjects are preferred, for example:

```text
fix: handle malformed collector snapshot
feat: add server status filter
docs: expand SSH setup guide
test: cover rotated log reconnect
```

## License

By contributing, you agree that your contribution may be distributed under the project's MIT License.