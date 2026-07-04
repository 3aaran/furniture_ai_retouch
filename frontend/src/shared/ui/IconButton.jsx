import React from 'react';

function IconButton({
  as:Tag='button',
  type='button',
  icon,
  label,
  title,
  className='',
  children,
  ...props
}){
  const content=<>{icon}{children||label?<span>{children||label}</span>:null}</>;
  if(Tag==='button'){
    return <button type={type} className={className} title={title||label} aria-label={label||title} {...props}>{content}</button>;
  }
  return <Tag className={className} title={title||label} aria-label={label||title} {...props}>{content}</Tag>;
}

export default IconButton;
