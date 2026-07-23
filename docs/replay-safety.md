# Replay Safety

`bugrepro replay` runs the captured command from the bundle's `fixtures/` directory. It skips the confirmation prompt only for `cat` and `grep` commands that do not contain shell-control characters or known dangerous command names.

All code-executing commands require explicit confirmation. This includes shell interpreters such as `bash` and `sh`, language runtimes such as Node.js and Python, and package runners such as npm, pnpm, and Yarn. Interpreter evaluation forms such as `bash -c`, `sh -c`, and `python -c` are never prompt-free.

Use `--yes` only in trusted automation after reviewing:

- `REPRO.md`
- `repro.json`
- bundled fixture contents

The MVP does not sandbox or containerize commands. Treat replay like running any local script from a bug report.
