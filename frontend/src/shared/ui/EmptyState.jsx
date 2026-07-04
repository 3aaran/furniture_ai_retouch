import React from 'react';

function EmptyState({className='empty big',children='暂无数据'}){
  return <div className={className}>{children}</div>;
}

export default EmptyState;
