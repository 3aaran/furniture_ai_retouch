export const AUTH_UNAUTHORIZED_EVENT='auth:unauthorized';
export const AUTH_LOGIN_EVENT='auth:login';
let activeToken=null;

function browserEvent(type,detail){
  return typeof CustomEvent==='function'?new CustomEvent(type,{detail}):{type,detail};
}

export function expireAuthSession({
  storage=globalThis.localStorage,
  eventTarget=globalThis.window,
  eventFactory=browserEvent
}={}){
  activeToken=null;
  storage?.removeItem?.('token');
  eventTarget?.dispatchEvent?.(eventFactory(AUTH_UNAUTHORIZED_EVENT));
}

export function getAuthToken({storage=globalThis.localStorage}={}){
  return activeToken||storage?.getItem?.('token')||null;
}

export function completeAuthSession({
  token,
  user,
  storage=globalThis.localStorage,
  eventTarget=globalThis.window,
  eventFactory=browserEvent
}={}){
  if(!token)throw new Error('登录响应缺少 token');
  activeToken=token;
  storage?.setItem?.('token',token);
  eventTarget?.dispatchEvent?.(eventFactory(AUTH_LOGIN_EVENT,user));
}
