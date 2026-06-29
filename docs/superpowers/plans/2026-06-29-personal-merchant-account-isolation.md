# Personal and Merchant Account Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add immediate personal registration while preserving the existing merchant account system, requiring tenant-scoped merchant login and enforcing complete PERSONAL/MERCHANT/SYSTEM data isolation across the backend, Web app, and mini program.

**Architecture:** Keep `users` as the merchant/admin account table and add `personal_users`. Add `account_principals` as the shared foreign-key target, carry `accountDomain` in every new JWT, and add `account_domain` to user-owned business records so every read and write is scoped by both identity and domain. Existing merchant data stays in place and is backfilled as `MERCHANT`; system resources stay `SYSTEM`.

**Tech Stack:** Node.js ESM, Express, MySQL 8/mysql2, JWT, bcryptjs, React 18/Vite, uni-app/Vue, Node test runner, HBuilderX mp-weixin compiler.

---

## Execution constraints

- Preserve the user-staged `miniapp-uni/project.private.config.json`; do not include it in feature commits.
- Use local `npm` commands in this checkout. Cloud deployment remains a separate step and should use `pnpm` when requested.
- Follow red-green-refactor for every task. Do not write production code until its named failing test has been run and failed for the expected missing behavior.
- Do not remove or rewrite historical merchant rows. Schema initialization must be repeatable when `AUTO_INIT_DB=true`.
- Do not leave a password-login endpoint that can authenticate a merchant account without `merchantCode`.

## File structure

### New backend units

- `backend/src/accounts/accountDomain.js`: account-domain constants, table selection, public account normalization.
- `backend/src/accounts/accountRepository.js`: domain-aware account loading and principal creation.
- `backend/src/accounts/accountScope.js`: SQL ownership predicates and write metadata.
- `backend/src/accounts/accountBalanceService.js`: lock, debit, refund, and read PERSONAL/MERCHANT balances.
- `backend/src/accounts/accountAuthService.js`: personal registration/login, admin login, and merchant-code login.
- `backend/src/services/smsCodeService.js`: reusable SMS-code scene, send, consume, and verification-token logic extracted from `server.js`.
- `backend/src/routes/accountAuthRoutes.js`: HTTP endpoints for personal, admin, merchant, and WeChat authentication.
- `backend/src/services/merchantApplicationService.js`: personal upgrade application and approval transaction.

### New Web units

- `frontend/src/account/auth/authRoute.js`: hash-route parsing and account-domain landing rules.
- `frontend/src/account/pages/AuthFrame.jsx`: shared existing login-page visual shell.
- `frontend/src/account/pages/MerchantLogin.jsx`: merchant-code, account, and password form.

### New mini-program unit

- `miniapp-uni/pages/login/merchant.vue`: isolated merchant-code login page.

---

### Task 1: Define account domains and create repeatable schema migration

**Files:**
- Create: `backend/src/accounts/accountDomain.js`
- Create: `backend/src/accounts/accountDomain.test.mjs`
- Create: `backend/src/accounts/dbAccountIsolationContract.test.mjs`
- Modify: `backend/src/db.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Write the failing domain and schema contract tests**

```js
// backend/src/accounts/accountDomain.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCOUNT_DOMAIN,
  accountDomainForLegacyUser,
  accountTableForDomain
} from './accountDomain.js';

test('legacy system admins map to SYSTEM and all other users map to MERCHANT', () => {
  assert.equal(accountDomainForLegacyUser({ role: 'SYSTEM_ADMIN' }), ACCOUNT_DOMAIN.SYSTEM);
  assert.equal(accountDomainForLegacyUser({ role: 'MERCHANT_OWNER' }), ACCOUNT_DOMAIN.MERCHANT);
  assert.equal(accountDomainForLegacyUser({ role: 'STAFF' }), ACCOUNT_DOMAIN.MERCHANT);
});

test('account tables are selected only from validated domains', () => {
  assert.equal(accountTableForDomain('PERSONAL'), 'personal_users');
  assert.equal(accountTableForDomain('MERCHANT'), 'users');
  assert.equal(accountTableForDomain('SYSTEM'), 'users');
  assert.throws(() => accountTableForDomain('UNKNOWN'), /账户域/);
});
```

```js
// backend/src/accounts/dbAccountIsolationContract.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../db.js', import.meta.url), 'utf8');

test('database initialization declares account principals and personal users', () => {
  assert.match(source, /CREATE TABLE IF NOT EXISTS account_principals/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS personal_users/);
  assert.match(source, /personal_registration_quota','100'/);
});

test('owned business tables receive account_domain', () => {
  for (const table of [
    'workflow_runs','announcement_reads','images','image_main_categories','quota_logs','system_logs',
    'watermarks','feedbacks','redeem_logs','ai_tasks','ai_model_call_logs','image_process_tasks'
  ]) {
    assert.match(source, new RegExp(`ensureColumn\\('${table}', 'account_domain'`), table);
  }
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```powershell
node --test backend/src/accounts/accountDomain.test.mjs backend/src/accounts/dbAccountIsolationContract.test.mjs
```

Expected: FAIL because `accountDomain.js`, `account_principals`, and `personal_users` do not exist.

- [ ] **Step 3: Implement the domain constants**

```js
// backend/src/accounts/accountDomain.js
export const ACCOUNT_DOMAIN = Object.freeze({
  SYSTEM: 'SYSTEM',
  MERCHANT: 'MERCHANT',
  PERSONAL: 'PERSONAL'
});

export function normalizeAccountDomain(value) {
  const domain = String(value || '').toUpperCase();
  if (!Object.values(ACCOUNT_DOMAIN).includes(domain)) throw new Error('无效账户域');
  return domain;
}

export function accountDomainForLegacyUser(user) {
  return user?.role === 'SYSTEM_ADMIN' ? ACCOUNT_DOMAIN.SYSTEM : ACCOUNT_DOMAIN.MERCHANT;
}

export function accountTableForDomain(value) {
  const domain = normalizeAccountDomain(value);
  return domain === ACCOUNT_DOMAIN.PERSONAL ? 'personal_users' : 'users';
}
```

- [ ] **Step 4: Add repeatable schema initialization and backfill**

Add these operations to `initDb()` in dependency order:

```js
await pool.query(`CREATE TABLE IF NOT EXISTS account_principals (
  id VARCHAR(36) PRIMARY KEY,
  account_domain ENUM('SYSTEM','MERCHANT','PERSONAL') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_principal_domain(account_domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

await pool.query(`CREATE TABLE IF NOT EXISTS personal_users (
  id VARCHAR(36) PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  avatar_url VARCHAR(500) NULL,
  password_hash VARCHAR(255) NOT NULL,
  wechat_openid VARCHAR(64) UNIQUE NULL,
  wechat_unionid VARCHAR(64) NULL,
  wechat_bound_at DATETIME NULL,
  quota_balance INT NOT NULL DEFAULT 0,
  storage_limit_bytes BIGINT NOT NULL DEFAULT ${DEFAULT_USER_STORAGE_LIMIT_BYTES},
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  status ENUM('ACTIVE','DISABLED','DELETED') NOT NULL DEFAULT 'ACTIVE',
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_personal_principal FOREIGN KEY(id) REFERENCES account_principals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

await pool.query(`INSERT IGNORE INTO account_principals(id,account_domain,created_at)
  SELECT id,IF(role='SYSTEM_ADMIN','SYSTEM','MERCHANT'),created_at FROM users`);
```

Add `account_domain ENUM('SYSTEM','MERCHANT','PERSONAL') NOT NULL DEFAULT 'MERCHANT'` with `ensureColumn` to every table named in the contract test. Add `(account_domain,user_id)` and `(account_domain,merchant_id)` indexes where those columns exist. Make `quota_logs.merchant_id` nullable with an information-schema guarded `ALTER TABLE quota_logs MODIFY merchant_id VARCHAR(36) NULL`.

Backfill with explicit rules:

```sql
UPDATE images
SET account_domain=CASE
  WHEN source_type='RESOURCE' AND resource_scope='SYSTEM' THEN 'SYSTEM'
  ELSE 'MERCHANT'
END;

UPDATE image_main_categories
SET account_domain=CASE WHEN scope='SYSTEM' THEN 'SYSTEM' ELSE 'MERCHANT' END;

UPDATE quota_logs SET account_domain='MERCHANT' WHERE account_domain<>'MERCHANT';

UPDATE workflow_runs t
LEFT JOIN account_principals p ON p.id=t.user_id
SET t.account_domain=CASE WHEN t.merchant_id IS NOT NULL THEN 'MERCHANT' ELSE COALESCE(p.account_domain,'MERCHANT') END;
```

Apply the final join-based statement to `system_logs`, `watermarks`, `feedbacks`, `redeem_logs`, `ai_tasks`, `ai_model_call_logs`, and `image_process_tasks`, using each table's user-owner column. Backfill `announcement_reads` directly from its `user_id` principal because it has no `merchant_id`. Because no PERSONAL rows exist before launch, the backfill can only produce SYSTEM or MERCHANT.

Add `personal_user_id VARCHAR(36) NULL` and `application_type ENUM('NEW_MERCHANT','PERSONAL_UPGRADE') NOT NULL DEFAULT 'NEW_MERCHANT'` to `merchant_applications`.

Before replacing the three current `users(id)` foreign keys, backfill principals, drop `fk_notice_read_user`, `fk_images_user`, and `fk_watermarks_user` only when present, then recreate them against `account_principals(id)` with their current delete behavior. Implement an `ensureForeignKey()` helper using `information_schema.REFERENTIAL_CONSTRAINTS`, so rerunning initialization is safe.

Add to settings defaults:

```js
['personal_registration_quota','100']
```

The built-in admin and demo merchant/user seed paths run after the first backfill, so each seed insertion must create its `account_principals` row before `INSERT INTO users`. A fresh database must not contain users without principals.

Create or replace a read-only directory view after both account tables exist:

```sql
CREATE OR REPLACE VIEW account_directory AS
SELECT id,'SYSTEM' account_domain,merchant_id,phone,username,display_name,role,status
FROM users WHERE role='SYSTEM_ADMIN'
UNION ALL
SELECT id,'MERCHANT',merchant_id,phone,username,display_name,role,status
FROM users WHERE role<>'SYSTEM_ADMIN'
UNION ALL
SELECT id,'PERSONAL',NULL,phone,phone,display_name,'PERSONAL',status
FROM personal_users;
```

Add `"test": "node --test"` to `backend/package.json`.

- [ ] **Step 5: Run the focused tests and verify GREEN**

```powershell
node --test backend/src/accounts/accountDomain.test.mjs backend/src/accounts/dbAccountIsolationContract.test.mjs
```

Expected: 4 tests pass.

- [ ] **Step 6: Commit only Task 1 files**

```powershell
git add backend/src/accounts/accountDomain.js backend/src/accounts/accountDomain.test.mjs backend/src/accounts/dbAccountIsolationContract.test.mjs backend/src/db.js backend/package.json
git commit -m "feat: add isolated account domain schema"
```

---

### Task 2: Add domain-aware account repository and JWT authentication

**Files:**
- Create: `backend/src/accounts/accountRepository.js`
- Create: `backend/src/accounts/accountRepository.test.mjs`
- Modify: `backend/src/auth.js`
- Modify: `backend/src/db.js`
- Modify: `backend/src/server.js`

- [ ] **Step 1: Write failing repository tests**

```js
// backend/src/accounts/accountRepository.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { findAccountById, principalPayload, publicAccount } from './accountRepository.js';

test('personal lookup never queries users', async () => {
  const calls = [];
  const db = { query: async (sql, params) => (calls.push([sql, params]), [[{ id:'p1', phone:'13800000000', display_name:'张三', status:'ACTIVE' }]]) };
  const account = await findAccountById(db, 'p1', 'PERSONAL');
  assert.match(calls[0][0], /FROM personal_users/);
  assert.doesNotMatch(calls[0][0], /FROM users/);
  assert.equal(account.account_domain, 'PERSONAL');
});

test('JWT payload contains explicit account domain', () => {
  assert.deepEqual(principalPayload({ id:'u1', role:'STAFF', merchant_id:'m1', account_domain:'MERCHANT' }), {
    id:'u1', role:'STAFF', merchantId:'m1', accountDomain:'MERCHANT'
  });
});

test('public personal account exposes PERSONAL without merchant data', () => {
  const value = publicAccount({ id:'p1', phone:'13800000000', display_name:'张三', quota_balance:100, status:'ACTIVE', account_domain:'PERSONAL' });
  assert.equal(value.accountDomain, 'PERSONAL');
  assert.equal(value.role, 'PERSONAL');
  assert.equal(value.merchantId, null);
  assert.equal(value.quota, 100);
});
```

- [ ] **Step 2: Run and verify RED**

```powershell
node --test backend/src/accounts/accountRepository.test.mjs
```

Expected: FAIL because `accountRepository.js` does not exist.

- [ ] **Step 3: Implement repository primitives**

```js
// backend/src/accounts/accountRepository.js
import { ACCOUNT_DOMAIN, accountDomainForLegacyUser, accountTableForDomain, normalizeAccountDomain } from './accountDomain.js';

export async function findAccountById(conn, id, requestedDomain) {
  const domain = normalizeAccountDomain(requestedDomain);
  const table = accountTableForDomain(domain);
  const [rows] = await conn.query(`SELECT * FROM ${table} WHERE id=? AND status<>"DELETED" LIMIT 1`, [id]);
  const account = rows[0];
  if (!account) return null;
  const actualDomain = table === 'personal_users' ? ACCOUNT_DOMAIN.PERSONAL : accountDomainForLegacyUser(account);
  if (actualDomain !== domain) return null;
  return { ...account, account_domain: actualDomain };
}

export function principalPayload(account) {
  return {
    id: account.id,
    role: account.role || 'PERSONAL',
    merchantId: account.merchant_id || null,
    accountDomain: account.account_domain
  };
}

export function publicAccount(account) {
  const personal = account.account_domain === ACCOUNT_DOMAIN.PERSONAL;
  return {
    id: account.id,
    merchantId: personal ? null : (account.merchant_id || null),
    phone: account.phone,
    username: account.username || account.phone,
    displayName: account.display_name || account.username || account.phone,
    avatarUrl: account.avatar_url || '',
    companyName: personal ? null : (account.company_name || null),
    role: personal ? 'PERSONAL' : account.role,
    accountDomain: account.account_domain,
    quota: Number(account.quota_balance || 0),
    storageLimitBytes: Number(account.storage_limit_bytes || 0),
    storageUsedBytes: Number(account.storage_used_bytes || 0),
    status: account.status
  };
}

export async function createPrincipal(conn, id, domain) {
  await conn.query('INSERT INTO account_principals(id,account_domain) VALUES(?,?)', [id, normalizeAccountDomain(domain)]);
}
```

- [ ] **Step 4: Make JWT signing and middleware domain-aware**

In `backend/src/auth.js`, sign `principalPayload(account)`. During verification:

```js
const requestedDomain = data.accountDomain || null;
let account;
if (requestedDomain) {
  account = await findAccountById(pool, data.id, requestedDomain);
} else {
  const legacy = await findUserById(data.id);
  account = legacy ? { ...legacy, account_domain: accountDomainForLegacyUser(legacy) } : null;
}
if (!account || account.status !== 'ACTIVE') return res.status(401).json({ message: messages.accountUnavailable });
req.user = account;
```

Keep trial expiry and merchant-status checks only for `account_domain==='MERCHANT'`. Update `server.js` `publicMe()` to start from `publicAccount(user)` and only load `merchants` for `MERCHANT` accounts. Keep `db.js publicUser()` as a compatibility wrapper that assigns the legacy domain before calling `publicAccount()`.

- [ ] **Step 5: Run repository tests and the existing backend suite**

```powershell
node --test backend/src/accounts/accountRepository.test.mjs
npm --prefix backend test
```

Expected: repository tests pass and the existing backend suite has zero failures.

- [ ] **Step 6: Commit**

```powershell
git add backend/src/accounts/accountRepository.js backend/src/accounts/accountRepository.test.mjs backend/src/auth.js backend/src/db.js backend/src/server.js
git commit -m "feat: authenticate accounts by explicit domain"
```

---

### Task 3: Extract SMS verification into a reusable account service

**Files:**
- Create: `backend/src/services/smsCodeService.js`
- Create: `backend/src/services/smsCodeService.test.mjs`
- Modify: `backend/src/server.js`

- [ ] **Step 1: Write failing scene-isolation tests**

```js
// backend/src/services/smsCodeService.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSmsScene, assertSmsSceneMatches } from './smsCodeService.js';

test('personal registration and login use separate SMS scenes', () => {
  assert.equal(normalizeSmsScene('PERSONAL_REGISTER'), 'PERSONAL_REGISTER');
  assert.equal(normalizeSmsScene('PERSONAL_LOGIN'), 'PERSONAL_LOGIN');
  assert.throws(() => assertSmsSceneMatches('PERSONAL_REGISTER', 'PERSONAL_LOGIN'), /场景/);
});

test('unknown scenes cannot be requested', () => {
  assert.throws(() => normalizeSmsScene('MERCHANT_BYPASS'), /验证码场景/);
});
```

- [ ] **Step 2: Run and verify RED**

```powershell
node --test backend/src/services/smsCodeService.test.mjs
```

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Extract the current server helpers without changing behavior**

Move SMS hashing, six-digit generation, rate limiting, send, consume, verification-token signing, and verification-token checking from `server.js` into `createSmsCodeService({ pool, sendSmsCode, jwtSecret })`. Export pure scene helpers:

```js
const ALLOWED_SMS_SCENES = new Set([
  'LOGIN','APPLICATION','PASSWORD_RESET','PERSONAL_REGISTER','PERSONAL_LOGIN'
]);

export function normalizeSmsScene(value) {
  const scene = String(value || 'LOGIN').trim().toUpperCase();
  if (!ALLOWED_SMS_SCENES.has(scene)) throw Object.assign(new Error('不支持的验证码场景'), { status:400 });
  return scene;
}

export function assertSmsSceneMatches(actual, expected) {
  if (normalizeSmsScene(actual) !== normalizeSmsScene(expected)) throw new Error('验证码场景不匹配');
}
```

`server.js` must call the extracted service for `/api/sms/send-code`, `/api/sms/verify-code`, password reset, and legacy application verification. Preserve the current five-minute expiry and rate limits.

- [ ] **Step 4: Run focused and existing authentication contract tests**

```powershell
node --test backend/src/services/smsCodeService.test.mjs frontend/src/account/pages/loginUnavailable.test.mjs
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/services/smsCodeService.js backend/src/services/smsCodeService.test.mjs backend/src/server.js
git commit -m "refactor: centralize account SMS verification"
```

---

### Task 4: Implement personal registration and personal/admin login

**Files:**
- Create: `backend/src/accounts/accountAuthService.js`
- Create: `backend/src/accounts/accountAuthService.test.mjs`
- Create: `backend/src/routes/accountAuthRoutes.js`
- Modify: `backend/src/server.js`
- Modify: `backend/src/routes/profileRoutes.js`

- [ ] **Step 1: Write failing personal-registration tests**

```js
// backend/src/accounts/accountAuthService.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountAuthService } from './accountAuthService.js';

test('personal registration checks only personal_users and uses configured initial quota', async () => {
  const statements = [];
  const conn = {
    query: async (sql, params=[]) => {
      statements.push([sql, params]);
      if (/SELECT id FROM personal_users/.test(sql)) return [[]];
      if (/personal_registration_quota/.test(sql)) return [[{ setting_value:'100' }]];
      return [[], []];
    }
  };
  const service = createAccountAuthService({
    pool:{ getConnection:async()=>({ ...conn, beginTransaction:async()=>{}, commit:async()=>{}, rollback:async()=>{}, release:()=>{} }) },
    verifySmsToken:async()=>true,
    hashPassword:async value=>`hash:${value}`,
    idFactory:()=> 'p1'
  });
  const account = await service.registerPersonal({ displayName:'张三', phone:'13800000000', password:'secret1', smsToken:'ok' });
  assert.equal(account.account_domain, 'PERSONAL');
  assert.equal(account.quota_balance, 100);
  assert.ok(statements.some(([sql])=>/INSERT INTO personal_users/.test(sql)));
  assert.ok(!statements.some(([sql])=>/SELECT id FROM users WHERE phone/.test(sql)));
});
```

Add tests that reject duplicate personal phone, invalid phone, blank nickname, password shorter than six characters, and a registration token from any scene other than `PERSONAL_REGISTER`.

- [ ] **Step 2: Run and verify RED**

```powershell
node --test backend/src/accounts/accountAuthService.test.mjs
```

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement personal registration and login service**

Implement these methods with injected dependencies and transactions:

```js
createAccountAuthService(deps).registerPersonal({ displayName, phone, password, smsToken })
createAccountAuthService(deps).loginPersonalPassword({ phone, password })
createAccountAuthService(deps).loginPersonalCode({ phone, code })
createAccountAuthService(deps).loginSystemAdmin({ identifier, password })
```

`registerPersonal()` must:

```js
await verifySmsToken(phone, 'PERSONAL_REGISTER', smsToken);
const [[existing]] = await conn.query('SELECT id FROM personal_users WHERE phone=? AND status<>"DELETED" LIMIT 1', [phone]);
if (existing) throw Object.assign(new Error('该手机号已注册个人账户'), { status:409 });
const [[setting]] = await conn.query('SELECT setting_value FROM app_settings WHERE setting_key="personal_registration_quota" LIMIT 1');
const quota = Math.max(0, Number(setting?.setting_value || 100));
await createPrincipal(conn, id, 'PERSONAL');
await conn.query('INSERT INTO personal_users(id,phone,display_name,password_hash,quota_balance,status) VALUES(?,?,?,?,?,"ACTIVE")', [id,phone,displayName,passwordHash,quota]);
```

Personal login must query only `personal_users`; admin login must query only `users WHERE role='SYSTEM_ADMIN'`. Return `{ token: sign(account), user: publicAccount(account) }`.

- [ ] **Step 4: Register explicit HTTP endpoints**

In `accountAuthRoutes.js`, add:

```text
POST /api/auth/personal/register
POST /api/auth/personal/login
POST /api/auth/personal/code-login
POST /api/auth/admin/login
```

Registration receives the one-time `smsToken` returned by `/api/sms/verify-code`. Do not expose a generic endpoint that searches both account tables.

Register the route module in `server.js`. Change the current `/api/auth/login` and `/api/auth/code-login` to return HTTP 400 with an explicit-client-upgrade message unless the request identifies the supported admin flow; no merchant may authenticate there without a merchant code.

- [ ] **Step 5: Make profile, avatar, and password reset domain-aware**

In `profileRoutes.js`, select and update `personal_users` for PERSONAL and `users` for MERCHANT/SYSTEM when changing profile data, avatars, or passwords. In `server.js`, apply the same table selection to `/api/me/password/reset-code` and `/api/me/password/reset`. Avatar lookup must authorize by `account_domain + id`; a personal ID must never be resolved through `users`.

Add a source contract to `accountAuthService.test.mjs` asserting `profileRoutes.js` contains `personal_users` and has no unconditional `UPDATE users SET password_hash` path.

- [ ] **Step 6: Run tests**

```powershell
node --test backend/src/accounts/accountAuthService.test.mjs backend/src/accounts/accountRepository.test.mjs backend/src/services/smsCodeService.test.mjs
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```powershell
git add backend/src/accounts/accountAuthService.js backend/src/accounts/accountAuthService.test.mjs backend/src/routes/accountAuthRoutes.js backend/src/server.js backend/src/routes/profileRoutes.js
git commit -m "feat: add immediate personal registration"
```

---

### Task 5: Require merchant code for every merchant password login and isolate WeChat login

**Files:**
- Modify: `backend/src/accounts/accountAuthService.js`
- Modify: `backend/src/accounts/accountAuthService.test.mjs`
- Modify: `backend/src/routes/accountAuthRoutes.js`
- Modify: `backend/src/server.js`

- [ ] **Step 1: Add failing merchant-tenant tests**

```js
test('merchant login scopes the account lookup by merchant code before password check', async () => {
  const calls = [];
  const pool = { query: async (sql, params) => {
    calls.push([sql, params]);
    return [[{ id:'u1', merchant_id:'m1', role:'STAFF', status:'ACTIVE', merchant_status:'ACTIVE', password_hash:'hash' }]];
  }};
  const service = createAccountAuthService({ pool, comparePassword:async()=>true });
  const account = await service.loginMerchant({ merchantCode:'123456', identifier:'staff01', password:'secret1' });
  assert.equal(account.account_domain, 'MERCHANT');
  assert.match(calls[0][0], /JOIN merchants/);
  assert.deepEqual(calls[0][1].slice(0,2), ['123456','staff01']);
});

test('merchant login rejects a missing merchant code before querying accounts', async () => {
  let queried = false;
  const service = createAccountAuthService({ pool:{ query:async()=>{ queried=true; return [[]]; } } });
  await assert.rejects(() => service.loginMerchant({ identifier:'staff01', password:'secret1' }), /门店码/);
  assert.equal(queried, false);
});
```

Add a test proving a personal row with the same phone is never queried.

- [ ] **Step 2: Run and verify RED**

```powershell
node --test backend/src/accounts/accountAuthService.test.mjs
```

Expected: FAIL because `loginMerchant` is missing.

- [ ] **Step 3: Implement tenant-scoped merchant authentication**

```js
async function loginMerchant({ merchantCode, identifier, password }) {
  if (!/^\d{6}$/.test(String(merchantCode || ''))) throw badRequest('请输入六位门店码');
  const [rows] = await pool.query(`
    SELECT u.*,m.status merchant_status,m.merchant_code
    FROM users u
    JOIN merchants m ON m.id=u.merchant_id
    WHERE m.merchant_code=? AND (u.username=? OR u.phone=?)
      AND u.role<>'SYSTEM_ADMIN' AND u.status<>'DELETED'
    LIMIT 1`, [merchantCode, identifier, identifier]);
  const account = rows[0];
  if (!account || !await comparePassword(password, account.password_hash)) throw unauthorized('门店码、账号或密码错误');
  if (account.status !== 'ACTIVE' || account.merchant_status !== 'ACTIVE') throw forbidden('门店账号不可用');
  return { ...account, account_domain:'MERCHANT' };
}
```

Expose `POST /api/auth/merchant/login`. Keep the same generic credential-error text for missing account, wrong account, and wrong password after basic field validation.

- [ ] **Step 4: Make WeChat endpoints personal-only**

Update `/api/auth/wechat/silent-login` and `/api/auth/wechat/phone-login` to query/bind only `personal_users`. A personal phone that exists only in `users` returns `needPersonalRegistration:true`; it must not authenticate a merchant. Merchant Web and mini-program login remain code + account + password only.

- [ ] **Step 5: Run tests**

```powershell
node --test backend/src/accounts/accountAuthService.test.mjs
```

Expected: account service tests pass. Mini-program contracts are updated and verified together with their production changes in Task 11.

- [ ] **Step 6: Commit**

```powershell
git add backend/src/accounts/accountAuthService.js backend/src/accounts/accountAuthService.test.mjs backend/src/routes/accountAuthRoutes.js backend/src/server.js
git commit -m "feat: require tenant code for merchant login"
```

---

### Task 6: Add personal upgrade applications and domain-safe approval

**Files:**
- Create: `backend/src/services/merchantApplicationService.js`
- Create: `backend/src/services/merchantApplicationService.test.mjs`
- Modify: `backend/src/routes/profileRoutes.js`
- Modify: `backend/src/routes/adminRoutes.js`
- Modify: `backend/src/routes/merchant/internalUserRoutes.js`
- Modify: `backend/src/routes/merchant/trialAccountRoutes.js`
- Modify: `backend/src/db.js`

- [ ] **Step 1: Write failing application tests**

```js
// backend/src/services/merchantApplicationService.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMerchantApplicationService } from './merchantApplicationService.js';

test('personal upgrade keeps the personal account and creates a separate merchant principal', async () => {
  const sql = [];
  const conn = { query:async statement => (sql.push(statement), [[],[]]), beginTransaction:async()=>{}, commit:async()=>{}, rollback:async()=>{}, release:()=>{} };
  const service = createMerchantApplicationService({ pool:{ getConnection:async()=>conn }, idFactory:(()=>{let n=0;return()=>`id${++n}`})(), hashPassword:async()=> 'hash' });
  await service.approve({ application:{ id:'a1', personal_user_id:'p1', phone:'13800000000', company_name:'甲店', contact_name:'张三', status:'PENDING' }, reviewerId:'admin', quota:500 });
  assert.ok(sql.some(value=>/INSERT INTO merchants/.test(value)));
  assert.ok(sql.some(value=>/INSERT INTO users/.test(value)));
  assert.ok(sql.some(value=>/INSERT INTO account_principals/.test(value)));
  assert.ok(!sql.some(value=>/UPDATE personal_users/.test(value)));
});
```

Add tests for one pending application per personal user, rejection, and approval refusing any non-PENDING row.

- [ ] **Step 2: Run and verify RED**

```powershell
node --test backend/src/services/merchantApplicationService.test.mjs
```

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement application service and authenticated endpoints**

Create methods:

```text
submitPersonalUpgrade(account, form)
getPersonalUpgradeStatus(account)
approve(applicationId, reviewerId, approvalOptions)
reject(applicationId, reviewerId, reason)
```

`submitPersonalUpgrade` must reject non-PERSONAL accounts and insert:

```sql
INSERT INTO merchant_applications(
  id,company_name,contact_name,phone,invite_code,note,status,personal_user_id,application_type
) VALUES(?,?,?,?,?,?,"PENDING",?,"PERSONAL_UPGRADE")
```

Register `GET/POST /api/me/merchant-upgrade` in `profileRoutes.js`.

- [ ] **Step 4: Use the service from admin approval**

Replace the approval transaction in `adminRoutes.js` with the service. The transaction must create, in order: merchant, MERCHANT principal, `users(MERCHANT_OWNER)`, application status, finance log. Preserve the current `000000` temporary merchant password behavior and response `{ phone, password, merchantCode, quota }`. Do not update `personal_users` or personal business rows.

Extend `publicApplication()` with `personalUserId` and `applicationType`. Keep old pending applications approvable as `NEW_MERCHANT`.

- [ ] **Step 5: Add principals to every merchant-user creation path**

In both `internalUserRoutes.js` and `trialAccountRoutes.js`, call `createPrincipal(conn, id, 'MERCHANT')` immediately before each new `INSERT INTO users`. Do not insert a principal when reactivating an existing soft-deleted user ID. Extend the test to scan `db.js`, `adminRoutes.js`, `internalUserRoutes.js`, and `trialAccountRoutes.js`: every new-user branch must create a principal in the same transaction.

- [ ] **Step 6: Run tests**

```powershell
node --test backend/src/services/merchantApplicationService.test.mjs backend/src/accounts/accountRepository.test.mjs
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```powershell
git add backend/src/services/merchantApplicationService.js backend/src/services/merchantApplicationService.test.mjs backend/src/routes/profileRoutes.js backend/src/routes/adminRoutes.js backend/src/routes/merchant/internalUserRoutes.js backend/src/routes/merchant/trialAccountRoutes.js backend/src/db.js
git commit -m "feat: add personal to merchant upgrade approval"
```

---

### Task 7: Make quota and storage operations account-domain aware

**Files:**
- Create: `backend/src/accounts/accountBalanceService.js`
- Create: `backend/src/accounts/accountBalanceService.test.mjs`
- Create: `backend/src/routes/accountQuotaRoutes.js`
- Modify: `backend/src/ai/taskService.js`
- Modify: `backend/src/services/storageService.js`
- Modify: `backend/src/server.js`
- Modify: `backend/src/routes/merchantRoutes.js`
- Modify: `backend/src/routes/profileRoutes.js`
- Modify: `frontend/src/store/quota/QuotaLogs.jsx`

- [ ] **Step 1: Write failing balance-target tests**

```js
// backend/src/accounts/accountBalanceService.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { balanceTargetFor } from './accountBalanceService.js';

test('personal balances use personal_users', () => {
  assert.deepEqual(balanceTargetFor({ id:'p1', role:'PERSONAL', account_domain:'PERSONAL' }), { table:'personal_users', id:'p1', mode:'PERSONAL' });
});

test('merchant owner balances use the merchant pool', () => {
  assert.deepEqual(balanceTargetFor({ id:'u1', role:'MERCHANT_OWNER', merchant_id:'m1', account_domain:'MERCHANT' }), { table:'merchants', id:'m1', mode:'MERCHANT_POOL' });
});

test('merchant staff balances stay in users', () => {
  assert.deepEqual(balanceTargetFor({ id:'u2', role:'STAFF', merchant_id:'m1', account_domain:'MERCHANT' }), { table:'users', id:'u2', mode:'MERCHANT_USER' });
});
```

- [ ] **Step 2: Run and verify RED**

```powershell
node --test backend/src/accounts/accountBalanceService.test.mjs
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement balance locking, debit, and refund**

Export `balanceTargetFor(account)`, `lockBalance(conn, account)`, `debitBalance(conn, account, amount)`, and `creditBalance(conn, account, amount)`. Build table names only through validated fixed mappings, never request input.

Return this consistent result:

```js
{ balance, table, id, mode }
```

Update `taskService.js` submission and failure-refund paths to call the service. Every personal `quota_logs` row must use `merchant_id=NULL`, `account_domain='PERSONAL'`, and the personal principal ID in operator/related fields. Merchant rows use `account_domain='MERCHANT'` and preserve current pool/user behavior.

- [ ] **Step 4: Make storage accounting domain-aware**

Change signatures to accept an account descriptor rather than a bare ID:

```js
getUserStorageSummary(conn, account)
assertUserStorageAvailable(conn, account, incomingBytes, options)
applyUserStorageDelta(conn, account, deltaBytes, log)
```

Use `personal_users` for PERSONAL and `users` for MERCHANT/SYSTEM. Build personal storage keys under `images/personal/<principalId>/...`; preserve existing merchant key paths. Update every caller in `server.js`, `taskService.js`, `merchantRoutes.js`, and `profileRoutes.js` to pass `req.user` or `{ id, account_domain, merchant_id }` from the task row.

- [ ] **Step 5: Add a domain-aware quota-log endpoint**

Create `accountQuotaRoutes.js`, register it from `server.js`, and expose `GET /api/account/quota-logs`. PERSONAL filters by `q.account_domain='PERSONAL' AND (related_user_id=? OR operator_user_id=?)`; MERCHANT preserves the current merchant filters. Read names from `account_directory` instead of joining only `users`.

Point `frontend/src/store/quota/QuotaLogs.jsx` at `/api/account/quota-logs` for every non-system account. Preserve the existing admin quota URL.

- [ ] **Step 6: Run tests**

```powershell
node --test backend/src/accounts/accountBalanceService.test.mjs backend/src/services/storageService.signed-url.test.mjs backend/src/ai/taskCompletion.test.mjs
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```powershell
git add backend/src/accounts/accountBalanceService.js backend/src/accounts/accountBalanceService.test.mjs backend/src/routes/accountQuotaRoutes.js backend/src/ai/taskService.js backend/src/services/storageService.js backend/src/server.js backend/src/routes/merchantRoutes.js backend/src/routes/profileRoutes.js frontend/src/store/quota/QuotaLogs.jsx
git commit -m "feat: isolate account quota and storage"
```

---

### Task 8: Enforce domain ownership on images, tasks, resources, logs, and feedback

**Files:**
- Create: `backend/src/accounts/accountScope.js`
- Create: `backend/src/accounts/accountScope.test.mjs`
- Modify: `backend/src/server.js`
- Modify: `backend/src/ai/taskService.js`
- Modify: `backend/src/routes/merchantRoutes.js`
- Modify: `backend/src/routes/adminRoutes.js`
- Modify: `backend/src/routes/profileRoutes.js`
- Modify: `backend/src/middleware/roleMiddleware.js`
- Modify: `backend/src/routes/merchant/internalUserRoutes.js`
- Modify: `backend/src/routes/merchant/trialAccountRoutes.js`
- Modify: `backend/src/services/resourceBindingService.js`
- Modify: `backend/src/workflows/workflowRunStore.js`

- [ ] **Step 1: Write failing ownership-predicate tests**

```js
// backend/src/accounts/accountScope.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { ownedReadScope, ownedWriteFields } from './accountScope.js';

test('personal reads require PERSONAL and the current user', () => {
  assert.deepEqual(ownedReadScope({ id:'p1', account_domain:'PERSONAL' }, 'i'), {
    sql:'i.account_domain=? AND i.user_id=? AND i.merchant_id IS NULL',
    params:['PERSONAL','p1']
  });
});

test('merchant admins read only their merchant domain', () => {
  assert.deepEqual(ownedReadScope({ id:'u1', role:'MERCHANT_OWNER', merchant_id:'m1', account_domain:'MERCHANT' }, 'i'), {
    sql:'i.account_domain=? AND i.merchant_id=?',
    params:['MERCHANT','m1']
  });
});

test('merchant staff reads require both merchant and current user', () => {
  const scope = ownedReadScope({ id:'u2', role:'STAFF', merchant_id:'m1', account_domain:'MERCHANT' }, 'i');
  assert.equal(scope.sql, 'i.account_domain=? AND i.merchant_id=? AND i.user_id=?');
  assert.deepEqual(scope.params, ['MERCHANT','m1','u2']);
});
```

- [ ] **Step 2: Run and verify RED**

```powershell
node --test backend/src/accounts/accountScope.test.mjs
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement fixed ownership helpers**

```js
// backend/src/accounts/accountScope.js
export function isMerchantPower(account) {
  return account.account_domain === 'MERCHANT' && ['MERCHANT_OWNER','MERCHANT_ADMIN'].includes(account.role);
}

export function ownedWriteFields(account) {
  if (account.account_domain === 'PERSONAL') return { accountDomain:'PERSONAL', merchantId:null, userId:account.id };
  if (account.account_domain === 'SYSTEM') return { accountDomain:'SYSTEM', merchantId:null, userId:account.id };
  return { accountDomain:'MERCHANT', merchantId:account.merchant_id, userId:account.id };
}

export function ownedReadScope(account, alias='') {
  const p = alias ? `${alias}.` : '';
  if (account.account_domain === 'PERSONAL') return { sql:`${p}account_domain=? AND ${p}user_id=? AND ${p}merchant_id IS NULL`, params:['PERSONAL',account.id] };
  if (isMerchantPower(account)) return { sql:`${p}account_domain=? AND ${p}merchant_id=?`, params:['MERCHANT',account.merchant_id] };
  if (account.account_domain === 'MERCHANT') return { sql:`${p}account_domain=? AND ${p}merchant_id=? AND ${p}user_id=?`, params:['MERCHANT',account.merchant_id,account.id] };
  return { sql:`${p}account_domain=?`, params:['SYSTEM'] };
}
```

- [ ] **Step 4: Apply ownership to every business write**

Add `account_domain` to INSERT/UPDATE paths for:

```text
workflow_runs
announcement_reads
images
image_main_categories
quota_logs
system_logs
watermarks
feedbacks
redeem_logs
ai_tasks
ai_model_call_logs
image_process_tasks
```

Use `ownedWriteFields(req.user)` for request paths and persist the task's domain into asynchronous completion/refund paths. Ensure AI-generated images inherit the originating task domain. System resources remain `SYSTEM`; merchant resources remain `MERCHANT`; personal resources remain `PERSONAL` with `resource_scope='USER'`.

- [ ] **Step 5: Apply ownership to every user-facing read/delete/download**

Replace user/merchant-only predicates in these exact route groups with `ownedReadScope()` plus resource-specific public-system clauses:

```text
/api/images/recent
/api/images
/api/images/:id/source
/api/images/:id/process
/api/images/:id/detail-rich
/api/images/:id/detail
/api/images/:id/regenerate
/api/images/:id (DELETE)
/api/images/:id/thumb
/api/images/:id/view
/api/images/:id/download
/api/images/:id/watermark-preview
/api/ai/tasks and task detail/status/delete routes
/api/merchant/resources list/create/update/delete routes
/api/announcements and announcement read routes
/api/feedbacks
```

Admin and task-detail read queries may see names from all domains but must join `account_directory` rather than only `users`. Non-admin queries may never authorize by phone.

Add `requireMerchantDomain` to `roleMiddleware.js` and apply it before every `/api/merchant/users`, trial-account, promotion, merchant-watermark, and merchant-management handler. PERSONAL receives 403 even if the client forges a role string. Personal resources remain available only through handlers that explicitly use `ownedReadScope()` with `resource_scope='USER'`.

- [ ] **Step 6: Add a static regression contract for SQL writes**

Extend `accountScope.test.mjs` to read `server.js`, `taskService.js`, and `merchantRoutes.js`, asserting every `INSERT INTO images` and `INSERT INTO ai_tasks` statement includes `account_domain`, and that the old patterns `WHERE i.id=? AND (? OR i.user_id=? OR i.merchant_id=?)` are absent from user-facing paths.

- [ ] **Step 7: Run backend tests**

```powershell
npm --prefix backend test
```

Expected: zero failures.

- [ ] **Step 8: Commit**

```powershell
git add backend/src/accounts/accountScope.js backend/src/accounts/accountScope.test.mjs backend/src/server.js backend/src/ai/taskService.js backend/src/routes/merchantRoutes.js backend/src/routes/adminRoutes.js backend/src/routes/profileRoutes.js backend/src/middleware/roleMiddleware.js backend/src/routes/merchant/internalUserRoutes.js backend/src/routes/merchant/trialAccountRoutes.js backend/src/services/resourceBindingService.js backend/src/workflows/workflowRunStore.js
git commit -m "feat: enforce business data account domains"
```

---

### Task 9: Build separate Web personal/admin and merchant login flows

**Files:**
- Create: `frontend/src/account/auth/authRoute.js`
- Create: `frontend/src/account/auth/authRoute.test.mjs`
- Create: `frontend/src/account/pages/AuthFrame.jsx`
- Create: `frontend/src/account/pages/MerchantLogin.jsx`
- Modify: `frontend/src/account/pages/Login.jsx`
- Modify: `frontend/src/account/AccountPages.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/styles/pages/auth.css`
- Modify: `frontend/src/account/pages/loginUnavailable.test.mjs`

- [ ] **Step 1: Write failing route tests**

```js
// frontend/src/account/auth/authRoute.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { authPageForHash, landingPageForAccount } from './authRoute.js';

test('merchant login has a separate hash route', () => {
  assert.equal(authPageForHash('#/merchant/login'), 'merchant');
  assert.equal(authPageForHash('#/login'), 'main');
});

test('personal and merchant accounts land on workbench while admin lands on dashboard', () => {
  assert.equal(landingPageForAccount({ accountDomain:'PERSONAL' }), 'workbench');
  assert.equal(landingPageForAccount({ accountDomain:'MERCHANT' }), 'workbench');
  assert.equal(landingPageForAccount({ accountDomain:'SYSTEM' }), 'dashboard');
});
```

Extend `loginUnavailable.test.mjs` to require personal registration endpoints, admin endpoint, merchant endpoint, a merchant-code field, and absence of `/api/applications` from the unauthenticated main form.

- [ ] **Step 2: Run and verify RED**

```powershell
npm --prefix frontend test -- src/account/auth/authRoute.test.mjs src/account/pages/loginUnavailable.test.mjs
```

Expected: FAIL because the new route helper and endpoints do not exist.

- [ ] **Step 3: Implement route helper and shared frame**

```js
// frontend/src/account/auth/authRoute.js
export function authPageForHash(hash='') {
  return String(hash).replace(/^#\/?/,'').split('?')[0] === 'merchant/login' ? 'merchant' : 'main';
}

export function landingPageForAccount(account={}) {
  return account.accountDomain === 'SYSTEM' || account.role === 'SYSTEM_ADMIN' ? 'dashboard' : 'workbench';
}
```

Move only the existing `authPageV2` background, brand intro, and card wrapper into `AuthFrame.jsx`; keep the current class names so visual changes stay minimal.

- [ ] **Step 4: Convert `Login.jsx` to personal registration/login plus admin switch**

Personal registration flow:

```text
POST /api/sms/send-code scene=PERSONAL_REGISTER
POST /api/sms/verify-code scene=PERSONAL_REGISTER
POST /api/auth/personal/register { displayName,phone,password,smsToken }
```

Personal password/SMS login uses `/api/auth/personal/login` and `/api/auth/personal/code-login`. Administrator mode stays in the same card and calls `/api/auth/admin/login`; it is a mode switch, not a separate route. Store the returned token and reload as today.

Replace “提交商家申请” with two links: “注册个人账户” and “门店账号登录”.

- [ ] **Step 5: Implement `MerchantLogin.jsx`**

Use fields `merchantCode`, `identifier`, and `password`; normalize the code to six digits and call:

```js
await req('/api/auth/merchant/login', {
  method:'POST',
  body:JSON.stringify({ merchantCode, identifier, password })
});
```

Provide a return link to `#/login`. Do not include SMS or WeChat login in this view.

- [ ] **Step 6: Route unauthenticated users correctly in `App.jsx`**

When no `me`, render `MerchantLogin` only for `#/merchant/login`; otherwise render `Login`. When a token resolves, use `/api/me` and the returned role/domain as today. Preserve landing-page behavior for `#/home`.

- [ ] **Step 7: Run Web tests and build**

```powershell
npm --prefix frontend test -- src/account/auth/authRoute.test.mjs src/account/pages/loginUnavailable.test.mjs
npm --prefix frontend run build
```

Expected: tests pass and Vite exits 0.

- [ ] **Step 8: Commit**

```powershell
git add frontend/src/account/auth/authRoute.js frontend/src/account/auth/authRoute.test.mjs frontend/src/account/pages/AuthFrame.jsx frontend/src/account/pages/MerchantLogin.jsx frontend/src/account/pages/Login.jsx frontend/src/account/AccountPages.jsx frontend/src/App.jsx frontend/src/styles/pages/auth.css frontend/src/account/pages/loginUnavailable.test.mjs
git commit -m "feat: separate Web personal and merchant login"
```

---

### Task 10: Add Web personal permissions, upgrade UI, and configurable initial quota

**Files:**
- Modify: `backend/src/config/permissionMatrix.js`
- Modify: `backend/src/routes/adminRoutes.js`
- Modify: `frontend/src/config/pageRegistry.jsx`
- Modify: `frontend/src/AppShell.jsx`
- Modify: `frontend/src/account/pages/Profile.jsx`
- Modify: `frontend/src/admin/AdminPages.jsx`
- Modify: `frontend/src/appShared.jsx`
- Create: `frontend/src/account/personalAccess.test.mjs`

- [ ] **Step 1: Write failing personal-access contract test**

```js
// frontend/src/account/personalAccess.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const registry = readFileSync(new URL('../config/pageRegistry.jsx', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../AppShell.jsx', import.meta.url), 'utf8');
const profile = readFileSync(new URL('./pages/Profile.jsx', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../admin/AdminPages.jsx', import.meta.url), 'utf8');

test('personal navigation excludes merchant management', () => {
  assert.match(registry, /personalPages/);
  assert.doesNotMatch(registry.match(/personalPages\s*=\s*\[[\s\S]*?\];/)?.[0] || '', /users|promotion/);
  assert.match(shell, /accountDomain==='PERSONAL'/);
});

test('personal profile exposes upgrade and admin settings expose registration quota', () => {
  assert.match(profile, /\/api\/me\/merchant-upgrade/);
  assert.match(admin, /personal_registration_quota/);
});
```

- [ ] **Step 2: Run and verify RED**

```powershell
npm --prefix frontend test -- src/account/personalAccess.test.mjs
```

Expected: FAIL because personal navigation and upgrade UI are missing.

- [ ] **Step 3: Add backend and frontend PERSONAL permissions**

Add to `permissionMatrix.js`:

```js
PERSONAL: {
  pages:['workbench','resources','images','quota','profile','feedback','redeem'],
  dataScope:'SELF',
  actions:['ai:create','feedback:create']
}
```

Add `personalPages` in `pageRegistry.jsx` containing only workbench, resources, and images. In `AppShell.roleNav()`, choose it when `me.accountDomain==='PERSONAL'` or `role==='PERSONAL'`. Ensure direct hashes for `users` and `promotion` fall back to workbench.

- [ ] **Step 4: Add personal upgrade status/form to Profile**

Render only for PERSONAL. Load `GET /api/me/merchant-upgrade`. If there is no PENDING application, show the existing merchant application fields and submit `POST /api/me/merchant-upgrade`. If PENDING/APPROVED/REJECTED, show the status and rejection reason. Do not add identity switching or data migration controls.

- [ ] **Step 5: Add configurable initial quota to the admin settings page**

Add `personal_registration_quota` under the quota/settings group with label “个人注册初始算力”. Backend settings allowlist must accept a non-negative integer and must not update existing accounts when changed.

Update application rows to display “个人升级” when `applicationType==='PERSONAL_UPGRADE'`, while retaining current approval buttons and account-result dialog.

- [ ] **Step 6: Run tests and build**

```powershell
npm --prefix frontend test -- src/account/personalAccess.test.mjs
npm --prefix frontend run build
```

Expected: pass and build exits 0.

- [ ] **Step 7: Commit**

```powershell
git add backend/src/config/permissionMatrix.js backend/src/routes/adminRoutes.js frontend/src/config/pageRegistry.jsx frontend/src/AppShell.jsx frontend/src/account/pages/Profile.jsx frontend/src/admin/AdminPages.jsx frontend/src/appShared.jsx frontend/src/account/personalAccess.test.mjs
git commit -m "feat: add personal Web permissions and upgrade flow"
```

---

### Task 11: Implement mini-program personal registration and separate merchant login

**Files:**
- Modify: `miniapp-uni/api/auth.js`
- Modify: `miniapp-uni/utils/auth.js`
- Modify: `miniapp-uni/pages/login/index.vue`
- Create: `miniapp-uni/pages/login/merchant.vue`
- Modify: `miniapp-uni/pages.json`
- Modify: `miniapp-uni/tests/miniapp-contract.test.mjs`

- [ ] **Step 1: Replace the old login contract with failing isolation assertions**

Add assertions:

```js
test('miniapp exposes personal registration and tenant-scoped merchant login', () => {
  const main = read('pages/login/index.vue');
  const merchant = read('pages/login/merchant.vue');
  const authApi = read('api/auth.js');
  assert.match(main, /PERSONAL_REGISTER/);
  assert.match(main, /registerPersonal/);
  assert.match(main, /loginPersonalByPassword/);
  assert.match(merchant, /merchantCode/);
  assert.match(merchant, /loginMerchant/);
  assert.doesNotMatch(merchant, /getPhoneNumber|loginByCode/);
  assert.match(authApi, /\/api\/auth\/personal\/register/);
  assert.match(authApi, /\/api\/auth\/merchant\/login/);
});
```

Update the existing WeChat assertion to require PERSONAL endpoints/semantics and to reject automatic merchant matching.

- [ ] **Step 2: Run and verify RED**

```powershell
node --test miniapp-uni/tests/miniapp-contract.test.mjs
```

Expected: FAIL because the merchant page and personal API methods do not exist.

- [ ] **Step 3: Add mini-program account API methods**

In `api/auth.js`, expose:

```js
export const registerPersonal = payload => post('/api/auth/personal/register', payload, { auth:false, loadingText:'注册中' }).then(saveLoginToken);
export const loginPersonalByPassword = payload => post('/api/auth/personal/login', payload, { auth:false, loadingText:'登录中' }).then(saveLoginToken);
export const loginPersonalByCode = payload => post('/api/auth/personal/code-login', payload, { auth:false, loadingText:'登录中' }).then(saveLoginToken);
export const loginAdmin = payload => post('/api/auth/admin/login', payload, { auth:false, loadingText:'登录中' }).then(saveLoginToken);
export const loginMerchant = payload => post('/api/auth/merchant/login', payload, { auth:false, loadingText:'登录中' }).then(saveLoginToken);
```

Persist the returned `user.accountDomain` with the existing user object; do not infer it from the page used.

- [ ] **Step 4: Convert `pages/login/index.vue` to main personal/admin auth**

Preserve its current visual structure. Add modes for personal login, personal registration, and system admin. Registration fields are nickname, phone, SMS code, password; verify the code for `PERSONAL_REGISTER`, then call `registerPersonal` with `smsToken`. Personal WeChat authorization may match only an existing `personal_users` record and must direct an unknown phone to the registration form.

Add a link to `/pages/login/merchant`.

- [ ] **Step 5: Create the merchant login page**

Reuse the existing field/button styles. Include only six-digit `merchantCode`, `identifier`, and `password`. Call `loginMerchant`, require a returned token, then `reLaunch('/pages/workbench/index')`. Add a return link to `/pages/login/index`.

Register the page immediately after the main login page in `pages.json`, with `navigationStyle: custom`.

- [ ] **Step 6: Run the mini-program contract test**

```powershell
node --test miniapp-uni/tests/miniapp-contract.test.mjs
```

Expected: all tests pass.

- [ ] **Step 7: Commit without the user-staged private config**

```powershell
git add miniapp-uni/api/auth.js miniapp-uni/utils/auth.js miniapp-uni/pages/login/index.vue miniapp-uni/pages/login/merchant.vue miniapp-uni/pages.json miniapp-uni/tests/miniapp-contract.test.mjs
git commit -m "feat: separate miniapp personal and merchant login"
```

---

### Task 12: Enforce mini-program personal navigation and add upgrade UI

**Files:**
- Modify: `miniapp-uni/components/app-topbar/app-topbar.vue`
- Modify: `miniapp-uni/pages/mine/index.vue`
- Modify: `miniapp-uni/pages/users/index.vue`
- Modify: `miniapp-uni/pages/promotion/index.vue`
- Modify: `miniapp-uni/api/user.js`
- Modify: `miniapp-uni/utils/model.js`
- Modify: `miniapp-uni/tests/miniapp-contract.test.mjs`

- [ ] **Step 1: Add failing personal-navigation assertions**

```js
test('personal miniapp users cannot see or enter merchant management', () => {
  const topbar = read('components/app-topbar/app-topbar.vue');
  const mine = read('pages/mine/index.vue');
  const users = read('pages/users/index.vue');
  const promotion = read('pages/promotion/index.vue');
  assert.match(topbar, /visibleMenuItems/);
  assert.match(topbar, /accountDomain/);
  assert.match(mine, /merchant-upgrade/);
  assert.match(users, /accountDomain[\s\S]*PERSONAL[\s\S]*reLaunch/);
  assert.match(promotion, /accountDomain[\s\S]*PERSONAL[\s\S]*reLaunch/);
});
```

- [ ] **Step 2: Run and verify RED**

```powershell
node --test miniapp-uni/tests/miniapp-contract.test.mjs
```

Expected: FAIL because personal filtering is absent.

- [ ] **Step 3: Filter menus from stored account domain**

In `app-topbar.vue`, load the current stored user and compute `visibleMenuItems`: PERSONAL excludes `users` and `promotion`; MERCHANT owner/admin keeps both; merchant staff keeps the existing staff-level list. The backend remains authoritative.

In `mine/index.vue`, conditionally hide the user/promotion service items for PERSONAL and show an “升级为门店” card. Add `getMerchantUpgrade()` and `submitMerchantUpgrade()` to `api/user.js` using `/api/me/merchant-upgrade`.

Change `getQuotaLogs()` in `api/user.js` from `/api/merchant/quota-logs` to `/api/account/quota-logs`, so both personal and merchant accounts use the domain-aware endpoint.

- [ ] **Step 4: Guard direct merchant-page navigation**

In `pages/users/index.vue` and `pages/promotion/index.vue` `onShow()`, read the stored user. If `accountDomain==='PERSONAL'`, show “个人账户无门店管理权限” and `reLaunch('/pages/workbench/index')` before any API call. Keep the server 403 checks as the actual security boundary.

Add `PERSONAL:'个人用户'` to `utils/model.js` role display.

- [ ] **Step 5: Run mini-program tests and compile**

```powershell
node --test miniapp-uni/tests/miniapp-contract.test.mjs
& 'E:\备份\HBuilderX\HBuilderX\cli.exe' launch mp-weixin --project 'D:\home\工作\ai家具修图软件\v4.2.2\furniture_ai_retouch\miniapp-uni' --compile true --continue-on-error false
```

Expected: contract tests pass and HBuilderX exits 0 without WXML/WXSS parse errors.

- [ ] **Step 6: Commit**

```powershell
git add miniapp-uni/components/app-topbar/app-topbar.vue miniapp-uni/pages/mine/index.vue miniapp-uni/pages/users/index.vue miniapp-uni/pages/promotion/index.vue miniapp-uni/api/user.js miniapp-uni/utils/model.js miniapp-uni/tests/miniapp-contract.test.mjs
git commit -m "feat: enforce miniapp personal permissions"
```

---

### Task 13: Verify migration safety and complete acceptance checks

**Files:**
- Create: `backend/src/accounts/accountIsolationAcceptance.test.mjs`
- Modify: `docs/superpowers/specs/2026-06-29-personal-merchant-account-isolation-design.md` only if implementation exposes a factual mismatch

- [ ] **Step 1: Add final static acceptance checks**

```js
// backend/src/accounts/accountIsolationAcceptance.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const db = readFileSync(new URL('../db.js', import.meta.url), 'utf8');
const auth = readFileSync(new URL('../auth.js', import.meta.url), 'utf8');
const routes = readFileSync(new URL('../routes/accountAuthRoutes.js', import.meta.url), 'utf8');

test('legacy merchant rows are backfilled, not moved', () => {
  assert.match(db, /INSERT IGNORE INTO account_principals[\s\S]*SELECT id/);
  assert.doesNotMatch(db, /INSERT INTO personal_users[\s\S]*SELECT[\s\S]*FROM users/);
});

test('all new tokens and merchant login routes carry explicit domains', () => {
  assert.match(auth, /accountDomain/);
  assert.match(routes, /\/api\/auth\/merchant\/login/);
  assert.match(routes, /merchantCode/);
});
```

- [ ] **Step 2: Run the complete automated suite**

```powershell
npm --prefix backend test
npm --prefix frontend test
node --test miniapp-uni/tests/miniapp-contract.test.mjs
```

Expected: zero failures.

- [ ] **Step 3: Run production builds/compilers**

```powershell
npm --prefix frontend run build
& 'E:\备份\HBuilderX\HBuilderX\cli.exe' launch mp-weixin --project 'D:\home\工作\ai家具修图软件\v4.2.2\furniture_ai_retouch\miniapp-uni' --compile true --continue-on-error false
```

Expected: both commands exit 0.

- [ ] **Step 4: Run a database migration rehearsal against a disposable database**

Create a disposable MySQL schema containing a copy of the current pre-feature schema and representative rows: one system admin, one merchant owner, one merchant staff user, one merchant image, one task, one quota log, and one system resource. Set `DB_NAME` to that disposable schema and run:

```powershell
$env:AUTO_INIT_DB='true'
node -e "import('./backend/src/db.js').then(async m=>{await m.initDb();await m.pool.end()})"
```

Run the same non-blocking initialization command a second time, then query:

```sql
SELECT account_domain,COUNT(*) FROM account_principals GROUP BY account_domain;
SELECT account_domain,COUNT(*) FROM images GROUP BY account_domain;
SELECT COUNT(*) FROM personal_users;
SELECT COUNT(*) FROM users;
```

Expected: both initialization runs succeed; existing user/image counts stay unchanged; merchant rows are MERCHANT, system resource rows are SYSTEM, and `personal_users` remains empty before registration.

- [ ] **Step 5: Manually exercise the required security matrix on the disposable database**

Verify these exact cases through the API:

```text
1. Register personal phone 13800000000 even when users contains the same phone.
2. Personal login returns accountDomain=PERSONAL and quota=100.
3. Merchant login without merchantCode returns 400/401 and no token.
4. Merchant login with the correct six-digit code returns accountDomain=MERCHANT.
5. Personal token cannot GET a merchant image ID (403 or 404).
6. Merchant token cannot GET a personal image ID (403 or 404).
7. Personal token gets 403 from /api/merchant/users and /api/merchant/promotion.
8. Personal upgrade approval creates a new merchant/user while personal_users and personal balances remain unchanged.
9. Existing merchant tokens issued before the deployment remain valid until their normal expiry.
```

- [ ] **Step 6: Check the final diff and staged-file boundary**

```powershell
git status --short
git diff --check
git log --oneline -15
```

Expected: no whitespace errors; `miniapp-uni/project.private.config.json` remains the user's pre-existing staged change and was never included in feature commits.

- [ ] **Step 7: Commit final acceptance test**

```powershell
git add backend/src/accounts/accountIsolationAcceptance.test.mjs
git commit -m "test: verify personal and merchant isolation"
```

---

## Final requirement mapping

- Separate `personal_users` and existing merchant `users`: Tasks 1-2.
- Same phone allowed across personal and merchant tables: Tasks 1 and 4.
- Immediate personal SMS registration with self-set password: Tasks 3-4, 9, and 11.
- Default 100 configurable quota: Tasks 1, 4, and 10.
- Merchant-code login for owners and subusers: Tasks 5, 9, and 11.
- Admin remains on the main login page: Tasks 4, 9, and 11.
- No personal user-management capability: Tasks 8, 10, and 12.
- Personal upgrade requires admin approval and creates a separate merchant account: Tasks 6, 10, and 12.
- Images, video/task outputs, storage, and quota remain isolated: Tasks 7-8.
- Existing merchant data remains in place: Tasks 1 and 13.
- Web and mini-program stay behaviorally aligned: Tasks 9-12.
