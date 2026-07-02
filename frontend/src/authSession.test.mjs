import test from 'node:test';
import assert from 'node:assert/strict';

async function loadAuthSession(){
  return import('./authSession.js').then(module=>({module}),error=>({error}));
}

test('401 会清理 token 并广播登录失效事件',async()=>{
  const loaded=await loadAuthSession();
  assert.equal(loaded.error,undefined,'应提供统一的登录失效处理模块');

  const removed=[];
  const events=[];
  const storage={removeItem:key=>removed.push(key)};
  const eventTarget={dispatchEvent:event=>events.push(event)};
  loaded.module.expireAuthSession({storage,eventTarget,eventFactory:type=>({type})});

  assert.deepEqual(removed,['token']);
  assert.deepEqual(events,[{type:loaded.module.AUTH_UNAUTHORIZED_EVENT}]);
});

test('登录成功后保存 token 并广播当前用户，无需整页刷新',async()=>{
  const loaded=await loadAuthSession();
  assert.equal(loaded.error,undefined);

  const stored=[];
  const events=[];
  const user={id:'user-1',role:'MERCHANT_OWNER'};
  loaded.module.completeAuthSession({
    token:'signed-token',
    user,
    storage:{setItem:(key,value)=>stored.push([key,value])},
    eventTarget:{dispatchEvent:event=>events.push(event)},
    eventFactory:(type,detail)=>({type,detail})
  });

  assert.deepEqual(stored,[['token','signed-token']]);
  assert.deepEqual(events,[{type:loaded.module.AUTH_LOGIN_EVENT,detail:user}]);
});

test('登录切页期间优先使用内存 token，避免持久存储读取竞态',async()=>{
  const loaded=await loadAuthSession();
  assert.equal(loaded.error,undefined);
  const storage={
    setItem:()=>{},
    getItem:()=>null,
    removeItem:()=>{}
  };

  loaded.module.completeAuthSession({
    token:'memory-token',
    user:{id:'user-2'},
    storage,
    eventTarget:{dispatchEvent:()=>{}},
    eventFactory:(type,detail)=>({type,detail})
  });
  assert.equal(loaded.module.getAuthToken({storage}),'memory-token');

  loaded.module.expireAuthSession({
    storage,
    eventTarget:{dispatchEvent:()=>{}},
    eventFactory:type=>({type})
  });
  assert.equal(loaded.module.getAuthToken({storage}),null);
});
