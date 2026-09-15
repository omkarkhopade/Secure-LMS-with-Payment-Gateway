import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  cwd: new URL('../client/', import.meta.url), stdio: 'inherit',
  env: { ...process.env, VITE_MAX_UPLOAD_BYTES: '4000000' },
});
process.exitCode = result.status ?? 1;
