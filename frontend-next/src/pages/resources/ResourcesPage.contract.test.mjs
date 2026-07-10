import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const resourcesDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(resourcesDir, 'ResourcesPage.tsx'), 'utf8');
const css = readFileSync(join(resourcesDir, 'ResourcesPage.css'), 'utf8');
const apiSource = readFileSync(join(resourcesDir, '..', '..', 'services', 'studio.api.ts'), 'utf8');

test('resources search area uses two-row desktop layout and system colors', () => {
  assert.match(source, /assetSearchTop/);
  assert.match(source, /assetFilterRow/);
  assert.doesNotMatch(source, /assetSearchControls/);
  assert.match(css, /\.assetSearchTop\s*\{[\s\S]*grid-template-columns:\s*minmax\(260px, 420px\) minmax\(0, 1fr\)/);
  assert.match(css, /\.assetFilterRow\s*\{[\s\S]*grid-template-columns:\s*minmax\(300px, max-content\) minmax\(180px, 260px\) minmax\(160px, 220px\)/);
  assert.doesNotMatch(css, /auth-bg-panel-deep|auth-text/);
});

test('resources cards hide scope path and permission-only selection controls', () => {
  assert.match(source, /return `\$\{mainName\(item\)\} \/ \$\{subName\(item\) \|\| resourceTypeName\(item\)\}`/);
  assert.doesNotMatch(source, /scopeName\(item\.scope\) \/ \$\{mainName\(item\)\}/);
  assert.match(source, /typeof item\.canManage === 'boolean'/);
  assert.match(apiSource, /canManage\?: boolean/);
  assert.match(source, /\{manageable && <label className="assetSelectBox"/);
  assert.doesNotMatch(source, /disabled=\{!manageable\}/);
});

test('resources mobile search, main category, and subcategory share one row', () => {
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.assetSearchBar\s*\{[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.assetSearchTop,[\s\S]*\.assetFilterRow\s*\{[\s\S]*display:\s*contents/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.assetSpaceTabs\s*\{[\s\S]*grid-column:\s*1 \/ -1/);
  assert.match(source, /assetSearchActionButton/);
  assert.doesNotMatch(source, /assetPcOnlyAction/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.assetSearchActions\s*\{[\s\S]*order:\s*5[\s\S]*grid-column:\s*1 \/ -1/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.assetSearchActionButton\s*\{[\s\S]*flex:\s*1 1 0/);
  assert.doesNotMatch(css, /assetPcOnlyAction/);
}
);
