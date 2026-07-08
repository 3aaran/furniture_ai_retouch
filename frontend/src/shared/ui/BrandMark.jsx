import React from 'react';

export default function BrandMark({className='',label='勋港品牌图标'}){
  return <span className={`brandMark ${className}`.trim()} aria-label={label} role="img">
    <img src="/brand/xungang-mark.svg" alt="" aria-hidden="true" />
  </span>;
}
