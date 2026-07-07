import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {describe,it} from 'node:test';
import {useResourcePagination} from './hooks/useResourcePagination.js';

const here=dirname(fileURLToPath(import.meta.url));
const srcRoot=join(here,'../..');
const spaceTabsSource=readFileSync(join(here,'components/ResourceSpaceTabs.jsx'),'utf8');
const signalSource=readFileSync(join(here,'components/ResourceSignalBar.jsx'),'utf8');
const viewSource=readFileSync(join(here,'ResourcesPageView.jsx'),'utf8');
const hookSource=readFileSync(join(here,'hooks/useResourcesPageView.jsx'),'utf8');
const mobileIndex=readFileSync(join(srcRoot,'styles/overrides/mobile-app/index.css'),'utf8');

describe('resource library interaction boundaries',()=>{
  it('collapses category branches instead of rendering every child permanently',()=>{
    assert.match(spaceTabsSource,/useState/);
    assert.match(spaceTabsSource,/aria-expanded/);
    assert.match(spaceTabsSource,/toggleMain/);
  });

  it('opens the mobile filters from the current selection signal',()=>{
    assert.match(signalSource,/resourceSignalEntry/);
    assert.match(signalSource,/onOpenFilters/);
    assert.match(viewSource,/isResourceSidebarOpen/);
    assert.match(viewSource,/resourceMobileDrawerBackdrop/);
    assert.match(hookSource,/mobileSidebarOpen/);
  });

  it('loads an isolated final mobile resource stylesheet',()=>{
    assert.match(mobileIndex,/@import '\.\/resources-current\.css';/);
  });

  it('limits store results to the selected rows by columns page size',()=>{
    const result=useResourcePagination({
      space:'STORE',
      systemItems:[],
      data:{items:Array.from({length:12},(_,index)=>({id:index+1})),total:12,page:1,pageSize:12},
      query:{page:1},
      pageSize:6,
      sysPage:1,
      setSysPage(){},
      setQuery(){}
    });
    assert.equal(result.displayItems.length,6);
  });
});
