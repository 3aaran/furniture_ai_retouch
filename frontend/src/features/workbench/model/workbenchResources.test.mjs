import assert from 'node:assert/strict';
import {describe,it} from 'node:test';
import {buildWorkbenchResourceCategoryOptions,filterWorkbenchResources} from './workbenchResources.js';

const resources=[
  {id:1,scope:'SYSTEM',resourceType:'material',name:'白橡木',objectName:'材质',colorName:'木材'},
  {id:2,scope:'SYSTEM',resourceType:'material',name:'黑色皮革',mainCategoryName:'软体',subCategoryName:'皮革'},
  {id:3,scope:'MERCHANT',resourceType:'material',name:'蓝色布艺',objectName:'软体',colorName:'布艺'},
  {id:4,scope:'SYSTEM',resourceType:'scene',name:'现代客厅',objectName:'场景模板',colorName:'客厅'},
  {id:5,scope:'SYSTEM',resourceType:'scene',name:'电商白底',mainCategoryName:'场景模板',subCategoryName:'电商白底'},
  {id:6,scope:'USER',resourceType:'user_reference',name:'用户图',objectName:'产品',colorName:'家具原图'},
  {id:7,scope:'USER',resourceType:'material',name:'个人棉麻',mainCategoryName:'软体',subCategoryName:'布艺'}
];

describe('workbench resource category filters',()=>{
  it('builds real category options from loaded resources and current operation',()=>{
    const materialCategories=buildWorkbenchResourceCategoryOptions({resources,resourceScope:'ALL',op:'material',materialTab:'material'});
    assert.deepEqual(materialCategories,[
      {name:'材质',subs:['木材']},
      {name:'软体',subs:['布艺','皮革']}
    ]);

    const sceneCategories=buildWorkbenchResourceCategoryOptions({resources,resourceScope:'SYSTEM',op:'replace_bg',materialTab:'material'});
    assert.deepEqual(sceneCategories,[
      {name:'场景模板',subs:['电商白底','客厅']}
    ]);
  });

  it('filters resources by main and sub category without mixing scene/material images',()=>{
    const softItems=filterWorkbenchResources({resources,resourceScope:'ALL',op:'material',materialTab:'material',mainCategory:'软体'});
    assert.deepEqual(softItems.map(item=>item.id),[2,3,7]);

    const leatherItems=filterWorkbenchResources({resources,resourceScope:'ALL',op:'material',materialTab:'material',mainCategory:'软体',subCategory:'皮革'});
    assert.deepEqual(leatherItems.map(item=>item.id),[2]);

    const whiteScene=filterWorkbenchResources({resources,resourceScope:'SYSTEM',op:'replace_bg',materialTab:'material',mainCategory:'场景模板',subCategory:'电商白底'});
    assert.deepEqual(whiteScene.map(item=>item.id),[5]);
  });

  it('keeps system user and personal resource scopes independent',()=>{
    const systemItems=filterWorkbenchResources({resources,resourceScope:'SYSTEM',op:'material',materialTab:'material'});
    const merchantItems=filterWorkbenchResources({resources,resourceScope:'MERCHANT',op:'material',materialTab:'material'});
    const personalItems=filterWorkbenchResources({resources,resourceScope:'USER',op:'material',materialTab:'material'});
    assert.deepEqual(systemItems.map(item=>item.id),[1,2]);
    assert.deepEqual(merchantItems.map(item=>item.id),[3]);
    assert.deepEqual(personalItems.map(item=>item.id),[7]);
  });
});
