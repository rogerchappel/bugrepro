export function helpText(): string {
  return `bugrepro - tiny sanitized repro bundles\n\nUsage:\n  bugrepro capture [--out .repro] [--fixture path] [--redact name::pattern::replacement] [--max-bytes bytes] -- <cmd>\n  bugrepro redact [--redact name::pattern::replacement] [file]\n  bugrepro pack [bundle-dir] [--out repro.tar.gz]\n  bugrepro replay [--yes] [bundle-dir]\n\nLocal-first by design: no uploads, no hidden network calls.\n`;
}
