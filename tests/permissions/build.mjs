// يبني كل مسارات الـ API إلى ملفات ESM مع بدائل وهمية للقاعدة والمصادقة، لاختبار الصلاحيات دون خادم حقيقي.
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '../../apps/hub-web/src');
const OUT = path.join(HERE, 'out');
fs.rmSync(OUT, { recursive: true, force: true });

const routes = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f === 'route.ts') routes.push(p);
  }
})(path.join(SRC, 'app/api'));

const mock = (n) => path.join(HERE, n);
const plugin = {
  name: 'mocks',
  setup(b) {
    b.onResolve({ filter: /^(xlsx|pg|papaparse|csv-parse|iconv-lite|sharp|uuid)$/ }, () => ({ path: mock('mock-generic.mjs') }));
    b.onResolve({ filter: /^next\/server$/ }, () => ({ path: mock('shim-next.mjs') }));
    b.onResolve({ filter: /^\.\.?\/(?:.*\/)?pg$/ }, () => ({ path: mock('mock-pg.mjs') }));
    b.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({ path: mock('mock-supabase.mjs') }));
    b.onResolve({ filter: /^\.\.?\/(?:.*\/)?supabase$/ }, () => ({ path: mock('mock-supabase.mjs') }));
  },
};
await build({
  entryPoints: Object.fromEntries(routes.map((r) => [path.relative(path.join(SRC, 'app/api'), r).replace(/\/route\.ts$/, '').replace(/[\/\[\]]/g, '_'), r])),
  outdir: OUT, bundle: true, format: 'esm', platform: 'node', plugins: [plugin], logLevel: 'error', outExtension: { '.js': '.mjs' },
});
console.log('built', routes.length);
