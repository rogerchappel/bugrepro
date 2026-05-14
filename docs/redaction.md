# Redaction Guide

Default rules catch common tokens, secret assignments, bearer headers, private keys, and the local home directory. They are intentionally conservative and readable.

Custom rules use:

```text
name::pattern::replacement
```

Examples:

```bash
bugrepro redact --redact 'tenant::acme-prod-[0-9]+::[tenant]' app.log
bugrepro capture --redact 'host::internal\\.example\\.test::[host]' -- npm test
```

Always review `REPRO.md` and `repro.json` before sharing a bundle.
