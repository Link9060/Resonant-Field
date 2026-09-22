import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const required = [
  'README.md',
  'docs/ARCHITECTURE.md',
  'docs/ROADMAP.md',
  'schemas/knowledge-node.schema.json',
  'schemas/knowledge-edge.schema.json',
  'apps/explorer/index.html',
  '.github/workflows/ci.yml',
  '.github/workflows/pages.yml'
];

for (const path of required) {
  await access(new URL(`../${path}`, import.meta.url), constants.R_OK);
}

for (const schema of ['knowledge-node.schema.json', 'knowledge-edge.schema.json']) {
  const raw = await readFile(new URL(`../schemas/${schema}`, import.meta.url), 'utf8');
  JSON.parse(raw);
}

console.log('Repository structure and JSON schemas look valid.');
