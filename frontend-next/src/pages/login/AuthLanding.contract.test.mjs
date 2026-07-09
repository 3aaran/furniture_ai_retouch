import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const loginDir = dirname(fileURLToPath(import.meta.url));
const srcDir = join(loginDir, '..', '..');
const landingSource = readFileSync(join(srcDir, 'pages', 'landing', 'LandingPage.tsx'), 'utf8');
const loginSource = readFileSync(join(loginDir, 'LoginPage.tsx'), 'utf8');
const loginCss = readFileSync(join(loginDir, 'LoginPage.css'), 'utf8');
const authStoreSource = readFileSync(join(srcDir, 'stores', 'auth.store.ts'), 'utf8');
const pwaSource = readFileSync(join(srcDir, 'components', 'pwa', 'PwaInstallButton.tsx'), 'utf8');
const mainSource = readFileSync(join(srcDir, 'main.tsx'), 'utf8');

test('landing login link is hidden for active local sessions', () => {
  assert.match(authStoreSource, /hasActiveAuthSession/);
  assert.match(authStoreSource, /jwtExpiryMs/);
  assert.match(authStoreSource, /clearAuthSession\(\)/);
  assert.match(landingSource, /hasActiveAuthSession/);
  assert.match(landingSource, /!\s*isLoggedIn\s*&&\s*<Link to="\/login"/);
});

test('mobile auth page keeps only form surface and filing footer', () => {
  assert.match(loginSource, /authMobileFooterNext/);
  assert.match(loginSource, /beian\.miit\.gov\.cn/);
  assert.match(loginCss, /@media \(max-width: 620px\)/);
  assert.match(loginCss, /\.authTopbarNext,[\s\S]*\.authIntroV2,[\s\S]*\.authAmbient,[\s\S]*\.authPageV2::before[\s\S]*display: none/);
  assert.match(loginCss, /\.authMobileFooterNext[\s\S]*display: flex/);
});

test('landing and auth install entries use one real PWA install component', () => {
  assert.match(landingSource, /<PwaInstallButton className="landingInstallBtnNext" \/>/);
  assert.match(loginSource, /<PwaInstallButton className="authInstallBtnNext" \/>/);
  assert.match(pwaSource, /beforeinstallprompt/);
  assert.match(pwaSource, /promptEvent\.prompt\(\)/);
  assert.match(pwaSource, /VITE_WINDOWS_EXE_URL/);
  assert.match(pwaSource, /VITE_ANDROID_APK_URL/);
  assert.match(mainSource, /serviceWorker/);
  assert.match(mainSource, /register\('\/sw\.js'\)/);
});
