const errorMessagePattern=/失败|错误|报错|不能|未配置|未登录|登录已过期|请重新登录|Payload|Error|failed|too large/i;

export function inferToastKind(message){
  return errorMessagePattern.test(String(message||''))?'error':'success';
}

