# AREA Live Logs

Near-real-time access log viewer for hosted web projects over SSH.

## Phase 0

Current prototype:

- connects to the hosting account over SSH
- reads an Apache domain access log using `tail -F`
- parses combined-style access log entries
- classifies common traffic
- does not store the SSH key passphrase

Current default log:

`/usr/local/apache/domlogs/kasidlv/rekini.craftin.lv-ssl_log`

## Categories

- `VISITOR`
- `BOT`
- `NOT_FOUND`
- `SERVER_ERROR`
- `WP_PROBE`
- `WP_TRAFFIC`
- `SECURITY_PROBE`
- `GREETING`

## Development

```powershell
npm run dev
```

Press `Ctrl+C` to stop.

## Roadmap

See `docs/ROADMAP.md`.