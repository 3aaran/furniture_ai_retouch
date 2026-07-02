import test from 'node:test';
import assert from 'node:assert/strict';

test('开发环境注销旧 Service Worker 并清空 PWA 缓存',async()=>{
  const {registerServiceWorker}=await import('./registerServiceWorker.js');
  const calls=[];
  const navigatorLike={serviceWorker:{
    register:()=>calls.push('register'),
    getRegistrations:async()=>[
      {unregister:async()=>calls.push('unregister-1')},
      {unregister:async()=>calls.push('unregister-2')}
    ]
  }};
  const cachesLike={
    keys:async()=>['old-static','old-runtime'],
    delete:async key=>calls.push(`delete-${key}`)
  };

  const error=await Promise.resolve()
    .then(()=>registerServiceWorker({isDev:true,navigatorLike,cachesLike}))
    .then(()=>null,caught=>caught);

  assert.equal(error,null);
  assert.deepEqual(calls,[
    'unregister-1','unregister-2',
    'delete-old-static','delete-old-runtime'
  ]);
});
