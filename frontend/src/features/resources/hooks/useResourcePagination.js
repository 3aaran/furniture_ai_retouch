export function useResourcePagination({
  space,
  systemItems,
  data,
  query,
  pageSize,
  sysPage,
  setSysPage,
  setQuery
}){
  const isSystem=space==='SYSTEM';
  const safePageSize=Math.max(1,Number(pageSize)||1);
  const systemPages=Math.max(1,Math.ceil((systemItems||[]).length/safePageSize));
  const systemDisplay=(systemItems||[]).slice((sysPage-1)*safePageSize,sysPage*safePageSize);
  const storeItems=data?.items||[];
  const storePages=Math.max(1,Math.ceil((data?.total||0)/(data?.pageSize||safePageSize)));
  const displayItems=isSystem?systemDisplay:storeItems.slice(0,safePageSize);
  const total=isSystem?(systemItems||[]).length:(data?.total||0);
  const currentPage=isSystem?sysPage:(data?.page||query?.page||1);
  const totalPages=isSystem?systemPages:storePages;

  function changePage(next){
    const page=Math.max(1,Math.min(totalPages,Number(next)||1));
    if(isSystem)setSysPage(page);
    else setQuery(q=>({...q,page}));
  }

  return {
    isSystem,
    displayItems,
    total,
    currentPage,
    totalPages,
    changePage
  };
}
