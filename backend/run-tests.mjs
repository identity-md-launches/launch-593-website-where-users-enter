import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = await mkdtemp(join(tmpdir(), 'pond-backend-tests-'));
try {
  const compile = spawnSync('tsc', ['--target', 'ES2022', '--module', 'ESNext', '--lib', 'ES2022,DOM', '--strict', '--skipLibCheck', '--rootDir', root, '--outDir', scratch,
    join(root, 'backend/supabase/functions/submit-project/core.ts'), join(root, 'src/lib/submissions.ts')], { cwd: scratch, stdio: 'inherit' });
  if (compile.status !== 0) process.exitCode = compile.status ?? 1;
  else {
    await mkdir(join(scratch, 'backend/tests'), { recursive: true });
    await writeFile(join(scratch, 'package.json'), '{"type":"module"}\n');
    await writeFile(join(scratch, 'backend/tests/core.test.mjs'), (await readFile(join(root, 'backend/tests/core.test.mjs'), 'utf8')).replaceAll(".ts'", ".js'"));
    const tests = spawnSync(process.execPath, ['--test', join(scratch, 'backend/tests/core.test.mjs')], { stdio: 'inherit' });
    process.exitCode = tests.status ?? 1;
  }
} finally { await rm(scratch, { recursive: true, force: true }); }
