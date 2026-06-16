import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync(new URL('./Login.jsx', import.meta.url), 'utf8');

describe('sms login and application verification', () => {
  it('uses backend sms APIs without calling cloud provider from the frontend', () => {
    assert.match(source, /\/api\/sms\/send-code/);
    assert.match(source, /\/api\/sms\/verify-code/);
    assert.match(source, /\/api\/auth\/code-login/);
    assert.doesNotMatch(source, /alicloud/i);
  });
});
