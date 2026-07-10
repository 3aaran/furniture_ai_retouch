import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(appDir, 'AppShell.tsx'), 'utf8');

test('management pages are limited to administrator roles', () => {
  assert.match(source, /'SYSTEM_ADMIN'/);
  assert.match(source, /'MERCHANT_OWNER'/);
  assert.match(source, /'MERCHANT_ADMIN'/);
  assert.match(source, /const managementPaths = new Set\(\['\/resources', '\/users', '\/promotion'\]\)/);
  assert.match(source, /canAccessManagementPages/);
});

test('desktop and mobile navigation hide management entries without permission', () => {
  assert.match(source, /requiresManagement: true/);
  assert.match(source, /visiblePrimaryNavItems/);
  assert.match(source, /visibleMobileMainNavItems/);
  assert.match(source, /filter\(\(item\) => !item\.requiresManagement \|\| hasManagementAccess\)/);
});

test('direct navigation to management pages redirects unauthorized users', () => {
  assert.match(source, /managementRoute && !userResolved/);
  assert.match(source, /managementRoute && !hasManagementAccess/);
  assert.match(source, /<Navigate to="\/studio" replace \/>/);
});
