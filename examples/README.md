# Examples

Run a tiny failing command and package its fixture:

```bash
npm run build
node dist/cli.js capture --out /tmp/bugrepro-example --fixture examples/minimal/input.txt -- node examples/minimal/fail.mjs
node dist/cli.js pack /tmp/bugrepro-example --out /tmp/bugrepro-example.tar.gz
```
