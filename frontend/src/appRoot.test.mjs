import test from 'node:test';
import assert from 'node:assert/strict';

test('热更新重复执行入口时复用同一个 React 根节点',async()=>{
  const loaded=await import('./appRoot.js').then(module=>({module}),error=>({error}));
  assert.equal(loaded.error,undefined,'应提供可复用的 React 根节点工厂');
  const scope={};
  const created=[];
  const createRoot=container=>{
    const root={container};
    created.push(root);
    return root;
  };

  const first=loaded.module.getOrCreateAppRoot({container:'root',createRoot,scope});
  const second=loaded.module.getOrCreateAppRoot({container:'root',createRoot,scope});

  assert.equal(first,second);
  assert.equal(created.length,1);
});
