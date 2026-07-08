import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const studioDir = dirname(fileURLToPath(import.meta.url));
const appShellSource = readFileSync(join(studioDir, '..', '..', 'app', 'AppShell.tsx'), 'utf8');
const source = readdirSync(studioDir)
  .filter((name) => name.endsWith('.tsx'))
  .map((name) => readFileSync(join(studioDir, name), 'utf8'))
  .join('\n');
const styleFiles = readdirSync(studioDir).filter((name) => /^Studio.*\.css$/.test(name));
const stylesByFile = new Map(styleFiles.map((name) => [name, readFileSync(join(studioDir, name), 'utf8')]));
const css = [...stylesByFile.values()].join('\n');

function duplicateRuleHeaders(stylesheet) {
  const withoutComments = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '');
  const headers = [];

  function collect(block, context) {
    let cursor = 0;
    while (cursor < block.length) {
      const open = block.indexOf('{', cursor);
      if (open < 0) break;
      const header = block.slice(cursor, open).trim().replace(/\s+/g, ' ');
      let depth = 1;
      let close = open + 1;
      while (close < block.length && depth > 0) {
        if (block[close] === '{') depth += 1;
        if (block[close] === '}') depth -= 1;
        close += 1;
      }
      const content = block.slice(open + 1, close - 1);
      if (header.startsWith('@media') || header.startsWith('@supports') || header.startsWith('@layer')) {
        collect(content, `${context} ${header}`);
      } else if (header && !header.startsWith('@')) {
        headers.push(`${context}::${header}`);
      }
      cursor = close;
    }
  }

  collect(withoutComments, 'root');
  return [...new Set(headers.filter((header, index) => headers.indexOf(header) !== index))];
}

test('studio exposes one responsive feature drawer and mobile settings flow', () => {
  assert.match(source, /featureDrawerOpen/);
  assert.match(source, /id="studio-feature-panel"/);
  assert.match(source, /studioDrawerBackdrop/);
  assert.match(source, /studioMobileConfigSummary/);
  assert.match(source, /studioMobileConfigRecent/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.doesNotMatch(source, /StudioPage(?:Mobile|Desktop)/);
});

test('studio css has one clean authority', () => {
  assert.doesNotMatch(css, /!important|\.topApp|\.wb[A-Z]|#[0-9a-f]{3,8}/i);
  assert.deepEqual(duplicateRuleHeaders(css), []);
});

test('every studio css class is represented by the studio component tree', () => {
  const classes = [...new Set([...css.matchAll(/\.(studio[A-Za-z0-9_-]+)/g)].map((match) => match[1]))];
  const missing = classes.filter((className) => !source.includes(className));
  assert.deepEqual(missing, []);
});

test('studio styles stay split into focused component files', () => {
  assert.ok(styleFiles.length >= 4);
  for (const [name, content] of stylesByFile) {
    assert.ok(content.split(/\r?\n/).length <= 500, `${name} must stay at or below 500 lines`);
  }
});

test('desktop studio keeps compact measured workspace geometry and density', () => {
  assert.match(appShellSource, /studioShell/);
  assert.match(source, /featurePickerGroup/);
  assert.match(source, /studioFeatureList isPickerOpen/);
  assert.match(source, /studioRecentGhost/);
  assert.match(css, /grid-template-columns:\s*248px minmax\(0, 1fr\) 302px/);
  assert.match(css, /studioLeftHeader/);
  assert.match(css, /@media \(min-width: 768px\)[\s\S]*\.studioFeatureList\s*\{[\s\S]*display:\s*none/);
  assert.match(css, /@media \(min-width: 768px\)[\s\S]*\.studioDescRow,[\s\S]*\.studioSearchBox\s*\{[\s\S]*display:\s*none/);
  assert.match(css, /\.studioUploadBox\s*\{[\s\S]*border-radius:\s*var\(--radius-xl\)/);
});

test('pc studio reads real backend content instead of local demo resources', () => {
  assert.match(source, /fetchWorkbenchResources/);
  assert.match(source, /fetchCategoryTree/);
  assert.match(source, /uploadWorkbenchResource/);
  assert.match(source, /visibleResourceItems/);
  assert.doesNotMatch(source, /filteredDemoResources|本地示例资源/);
});
