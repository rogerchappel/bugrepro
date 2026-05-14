# Replay Safety

`bugrepro replay` runs the captured command from the bundle's `fixtures/` directory. Commands outside the small allow-list, or commands containing shell-control characters, require an explicit confirmation prompt.

Use `--yes` only in trusted automation after reviewing:

- `REPRO.md`
- `repro.json`
- bundled fixture contents

The MVP does not sandbox or containerize commands. Treat replay like running any local script from a bug report.
