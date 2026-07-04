export async function copyText(text){
  const value=String(text||'');
  if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(value);
    return;
  }
  const area=document.createElement('textarea');
  area.value=value;
  area.setAttribute('readonly','');
  area.style.position='fixed';
  area.style.left='-9999px';
  document.body.appendChild(area);
  area.select();
  try{
    if(!document.execCommand('copy'))throw new Error('copy failed');
  }finally{
    document.body.removeChild(area);
  }
}
