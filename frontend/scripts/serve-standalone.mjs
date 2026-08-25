import { spawn } from 'node:child_process';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const standaloneRoot = path.resolve('.next/standalone');
const standaloneNext = path.join(standaloneRoot, '.next');

await mkdir(standaloneNext, { recursive: true });
await rm(path.join(standaloneRoot, 'public'), { recursive: true, force: true });
await rm(path.join(standaloneNext, 'static'), { recursive: true, force: true });
await cp('public', path.join(standaloneRoot, 'public'), { recursive: true });
await cp('.next/static', path.join(standaloneNext, 'static'), { recursive: true });

const server = spawn(process.execPath, [path.join(standaloneRoot, 'server.js')], {
  env: {
    ...process.env,
    HOSTNAME: '127.0.0.1',
    PORT: '3100',
  },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}

server.on('exit', code => process.exit(code ?? 0));
