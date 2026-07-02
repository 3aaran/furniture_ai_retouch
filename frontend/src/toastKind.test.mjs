import test from 'node:test';
import assert from 'node:assert/strict';

async function loadToastKind(){
  return import('./toastKind.js').then(module=>({module}),error=>({error}));
}

test('未登录提示必须显示为错误而不是成功',async()=>{
  const loaded=await loadToastKind();
  assert.equal(loaded.error,undefined,'应提供统一的提示类型判断模块');
  assert.equal(loaded.module.inferToastKind('未登录'),'error');
  assert.equal(loaded.module.inferToastKind('登录已过期，请重新登录'),'error');
  assert.equal(loaded.module.inferToastKind('资源已上传'),'success');
});
