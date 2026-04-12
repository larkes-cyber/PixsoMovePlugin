const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(projectRoot, 'manifest.json');
const outputDirectory = path.join(projectRoot, 'dist');
const outputPath = path.join(outputDirectory, 'manifest.json');

const manifest = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

if (typeof manifest.ui === 'string') {
  manifest.ui = 'ui.html';
}

if (typeof manifest.main === 'string') {
  manifest.main = 'main.js';
} else if (manifest.main && typeof manifest.main === 'object') {
  if (typeof manifest.main.sandbox === 'string') {
    manifest.main.sandbox = 'main.js';
  }

  if (typeof manifest.main.host === 'string') {
    manifest.main.host = 'host.js';
  }
}

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
