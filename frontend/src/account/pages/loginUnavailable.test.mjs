import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync(new URL('./Login.jsx', import.meta.url), 'utf8');

describe('login unavailable methods', () => {
  it('marks phone verification login as in development without calling code APIs', () => {
    assert.match(source, /手机验证码/);
    assert.match(source, /开发中/);
    assert.doesNotMatch(source, /\/api\/auth\/code-login/);
    assert.doesNotMatch(source, /\/api\/auth\/send-code/);
  });
});
