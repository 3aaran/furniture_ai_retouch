const ROOT_KEY='__xungangReactRoot';

export function getOrCreateAppRoot({container,createRoot,scope=globalThis}){
  if(!scope[ROOT_KEY])scope[ROOT_KEY]=createRoot(container);
  return scope[ROOT_KEY];
}

