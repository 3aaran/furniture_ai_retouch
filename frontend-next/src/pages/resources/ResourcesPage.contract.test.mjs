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

test('resources mobile category manager uses single-column modal and scoped subcategory creation', () => {
  assert.doesNotMatch(source, /assetCreateSubButton/);
  assert.doesNotMatch(css, /assetCreateSubButton/);
  assert.match(source, /function openCreateSubDialog\(main\?: CategoryOption\)/);
  assert.match(source, /if \(!main\)/);
  assert.match(source, /main\.id \? String\(main\.id\) : ''/);
  assert.match(source, /categoryDialog\.mainName/);
  assert.doesNotMatch(source, /createMainCategory\(\{ scope: managerScope, name: categoryDialog\.mainName/);
  assert.match(source, /const managerCategoryOptions = useMemo\(\(\) => categoryOptionsForScope\(flattenCategoryTrees\(\[\], categoryPurposes\), managerScope\)/);
  assert.match(source, /<button className="assetAddSubInline" type="button" disabled=\{categoryBusy\}/);
  assert.doesNotMatch(source, /item\.canManage && item\.id && <button className="assetAddSubInline"/);
  assert.doesNotMatch(source, /\{item\.id && <button className="assetAddSubInline"/);
  assert.doesNotMatch(source, /onClick=\{\(\) => openCreateSubDialog\(\)\}/);
  assert.match(source, /<\/aside>}\s+\{categoryDialog && <div className="assetDialogLayer"/);
  assert.match(css, /\.assetDialogLayer\s*\{[\s\S]*width:\s*100vw[\s\S]*place-items:\s*center/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.assetCategoryManageHead\s*\{[\s\S]*display:\s*grid/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.assetCategoryManageTools\s*\{[\s\S]*grid-template-columns:\s*minmax\(112px, 1fr\) auto 38px/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.assetCategoryCardGrid\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.assetCategoryPurposeGroup > header::after\s*\{[\s\S]*display:\s*none/);
});

test('category creation refreshes only category trees instead of waiting for the asset list', () => {
  assert.match(source, /async function loadCategoryTrees\(\)/);
  assert.match(source, /loadCategoryTrees\(\),/);
  assert.match(source, /refreshCategoriesInBackground\(managerScope, '主分类已创建'\)/);
  assert.match(source, /refreshCategoriesInBackground\(managerScope, '子分类已创建'\)/);
  assert.match(source, /void refreshCategories\(scopeToRefresh\)\.catch/);
  assert.doesNotMatch(source, /await createMainCategory\([\s\S]{0,320}await reloadAfterAction\(\)/);
  assert.doesNotMatch(source, /await createSubCategory\([\s\S]{0,240}await reloadAfterAction\(\)/);
});

test('asset upload and category mutations keep independent pending states', () => {
  assert.match(source, /const \[uploadBusy, setUploadBusy\] = useState\(false\)/);
  assert.match(source, /const \[categoryBusy, setCategoryBusy\] = useState\(false\)/);
  assert.doesNotMatch(source, /const \[busy, setBusy\] = useState\(false\)/);
  assert.match(source, /disabled=\{uploadBusy\} onClick=\{uploadAssets\}/);
  assert.match(source, /disabled=\{categoryBusy\} onClick=\{createMain\}/);
  assert.match(source, /disabled=\{categoryBusy\} onClick=\{createSub\}/);
  assert.match(source, /setCategoryDialog\(null\);\s+refreshCategoriesInBackground\(managerScope, '主分类已创建'\)/);
});
