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
  assert.doesNotMatch(source, /studioLeftHeader/);
  assert.doesNotMatch(css, /studioLeftHeader/);
  assert.match(css, /@media \(min-width: 768px\)[\s\S]*\.studioFeatureList\s*\{[\s\S]*display:\s*none/);
  assert.match(css, /@media \(min-width: 768px\)[\s\S]*\.studioDescRow\s*\{[\s\S]*display:\s*none/);
  assert.match(source, /\{!isMobile && <div className="studioResourceFilters">/);
  assert.match(css, /\.studioResourceFilters/);
  assert.match(css, /\.studioScopeTabs/);
  assert.match(css, /\.studioCategoryTabs/);
  assert.match(css, /\.studioSubcategoryChips/);
  assert.match(css, /\.studioUploadBox\s*\{[\s\S]*border-radius:\s*var\(--radius-xl\)/);
});

test('pc studio reads real backend content instead of local demo resources', () => {
  assert.match(source, /fetchWorkbenchResources/);
  assert.match(source, /uploadWorkbenchResource/);
  assert.match(source, /visibleResourceItems/);
  assert.match(source, /RESOURCE_PAGE_SIZE/);
  assert.match(source, /studioResourcePager/);
  assert.doesNotMatch(source, /filteredDemoResources|本地示例资源/);
});

test('desktop studio resource picker restores scoped category filters', () => {
  assert.match(source, /studioScopeTabs/);
  assert.match(source, /studioCategoryTabs/);
  assert.match(source, /studioSubcategoryChips/);
  assert.match(source, /resourceScope|resourceCategoryOptions|resourceKeyword/);
  assert.doesNotMatch(source, /studioFilterStack/);
  assert.doesNotMatch(css, /studioFilterStack|studioSectionLabel/);
  assert.doesNotMatch(source, /resourceMainName\(item\) \|\| '未分类'/);
});

test('desktop studio keeps all three columns independently usable without clipping settings', () => {
  assert.match(source, /className="studioSettingsScroll"/);
  assert.match(css, /@media \(min-width: 768px\)[\s\S]*\.studioLeftPanel\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /@media \(min-width: 768px\)[\s\S]*\.studioCenterPanel\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.studioSettingsScroll\s*\{[\s\S]*min-height:\s*0[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /@media \(min-width: 768px\)[\s\S]*\.studioGenerateArea\s*\{[\s\S]*flex:\s*0 0 auto/);
  assert.match(css, /\.studioVideoSettings \.studioControlGroup:nth-child\(2\) > div\s*\{[\s\S]*grid-template-columns:\s*repeat\(4/);
});

test('studio recent strip and settings match annotated behavior', () => {
  assert.doesNotMatch(source, /来自后端 AI 任务记录/);
  assert.match(source, /task\.previewUrl \? <img/);
  assert.match(source, /className="studioControlGroup studioInlineControl"/);
  assert.doesNotMatch(source, /<select value=\{ratio\}/);
  assert.match(source, /const \[promptOpen, setPromptOpen\] = useState\(false\);/);
  assert.match(source, /const \[referenceOpen, setReferenceOpen\] = useState\(false\);/);
  assert.doesNotMatch(source, /修改配置/);
  assert.match(css, /@media \(min-width: 768px\)[\s\S]*\.studioRecentList\s*\{[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /scroll-snap-type:\s*x proximity/);
});

test('studio asset picker and recent task actions use real APIs without random selection', () => {
  assert.match(source, /StudioAssetPickerModal/);
  assert.match(source, /fetchAiTaskDetail/);
  assert.match(source, /deleteAiTask/);
  assert.match(source, /TaskCompareModal/);
  assert.match(source, /fullTaskImageUrl/);
  assert.match(source, /fullTaskSourceImageUrl/);
  assert.doesNotMatch(source, /StudioTaskDetailModal/);
  assert.match(source, /resourceType: 'user_reference'/);
  assert.doesNotMatch(source, /pickLatestResource|pickLatestResources|从资源库/);
  assert.match(source, /资产库/);
  assert.match(source, /studioToast/);
});

test('mobile feature picker stays open while feature configuration owns all parameters', () => {
  assert.match(source, /if \(!isMobile\) \{\s+setMobileConfigSheet\(null\);\s+closeFeatureDrawer\(\);\s+\}/);
  assert.match(source, /featureBranches\.map/);
  assert.match(source, /studioFeatures\.filter\(\(item\) => item\.group === featureGroup\)/);
  assert.doesNotMatch(source, /!needsResourceLibrary && <div className="studioMobileConfigBlock"><span>功能参数<\/span>/);
  assert.match(source, /<button className="studioMobileResourceConfig"/);
  assert.match(source, /setMobileConfigSheet\('options'\)/);
});

test('studio enables reference video generation on desktop and mobile', () => {
  assert.match(source, /video_generate/);
  assert.match(source, /createVideoTask/);
  assert.match(source, /fetchRecentVideoTasks/);
  assert.match(source, /fetchVideoTaskStatus/);
  assert.match(source, /fetchVideoTaskDetail/);
  assert.match(source, /deleteVideoTask/);
  assert.match(source, /clientRequestId/);
  assert.match(source, /videoVersion/);
  assert.match(source, /videoDuration/);
  assert.match(source, /videoExtraRequirements/);
  assert.match(source, /1 到 9 张参考图|1–9 张参考图/);
  assert.doesNotMatch(source, /宣传短视频正在开发中/);
});

test('mobile exposes feature configuration for every studio feature', () => {
  assert.doesNotMatch(source, /\{needsResourceLibrary && <button className="studioMobileResourceConfig"/);
  assert.match(source, /function openFeatureOptionsFromMobile\(\)/);
  assert.match(source, /打开功能配置/);
});
