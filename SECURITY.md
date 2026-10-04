# Security Policy

## Supported versions

Security fixes are currently provided for the latest public release of QcY LiveLog Monitor.

| Version | Supported |
| --- | --- |
| 1.x | Yes |
| Pre-1.0 development snapshots | No |

## Reporting a vulnerability

Please do not publish security vulnerabilities in a public GitHub issue.

Preferred reporting method:

1. Open the QcY LiveLog Monitor repository on GitHub.
2. Use GitHub's private vulnerability reporting / Security Advisory feature when available.
3. Include enough information to reproduce the problem safely.
4. Do not include real SSH private keys, passphrases, access tokens or unredacted production logs.

Repository:

https://github.com/QvarcY/qcy-livelog-monitor

If private vulnerability reporting is unavailable, contact the maintainer through the QvarcY GitHub profile before sharing sensitive details publicly:

https://github.com/QvarcY

## Scope

Security-sensitive areas include:

- SSH connection handling
- host-key verification
- SSH private-key use
- remembered passphrase storage
- Electron main/preload/renderer boundaries
- server profile persistence
- remote command construction
- log parsing of untrusted remote data

## Credential model

QcY does not store SSH private keys inside the application.

Server profiles reference a private-key path on the local computer.

When the user chooses to remember a key passphrase, QcY encrypts it using Electron `safeStorage`. The encrypted credential store is separate from the server profile.

## Log data

Access logs may contain sensitive operational information, including:

- IP addresses
- URL paths and query strings
- referrers
- User-Agent strings
- application endpoint names

Please redact production information before attaching screenshots or logs to public issues.

## Security expectations for contributions

Pull requests must not contain:

- private keys
- passwords or passphrases
- access tokens
- production credentials
- real customer data
- private infrastructure addresses that are not intentionally public

Use reserved example values such as:

- `example.com`
- `example.net`
- `192.0.2.0/24`
- `198.51.100.0/24`
- `203.0.113.0/24`