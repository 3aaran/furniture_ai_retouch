import {useEffect,useState} from 'react';
import {addMainCategory,addSubCategory,fetchCategoryTree,saveMainCategory,saveSubCategory} from '../api/categoriesApi.js';

export function useResourceCategories({categoryScope,setMsg}){
  const [categoryOpen,setCategoryOpen]=useState(false);
  const [categoryTree,setCategoryTree]=useState([]);
  const [categoryLoading,setCategoryLoading]=useState(false);
  const [categoryError,setCategoryError]=useState('');
  const [categoryForm,setCategoryForm]=useState(null);

  async function loadCategories(){
    try{
      setCategoryLoading(true);
      setCategoryError('');
      const data=await fetchCategoryTree(categoryScope);
      setCategoryTree(data.purposes||[]);
    }catch(e){
      setCategoryError(e.message||'分类数据读取失败');
      setMsg?.(e.message);
    }finally{
      setCategoryLoading(false);
    }
  }

  useEffect(()=>{
    loadCategories();
  },[categoryScope]);

  function createMainCategory(purposeKey='user_reference'){
    setCategoryForm({mode:'createMain',title:'创建主分类',label:'分类名称',value:'',purposeKey,sortOrder:0});
  }

  function renameMainCategory(main){
    setCategoryForm({mode:'renameMain',title:'编辑主分类',label:'分类名称',value:main.name,main,sortOrder:main.sortOrder||0});
  }

  function deleteMainCategory(main){
    setCategoryForm({mode:'deleteMain',title:'删除主分类',value:main.name,main,danger:true});
  }

  function createSubCategory(main){
    setCategoryForm({mode:'createSub',title:'创建子分类',label:'分类名称',value:'',main,sortOrder:0});
  }

  function renameSubCategory(sub){
    setCategoryForm({mode:'renameSub',title:'编辑子分类',label:'分类名称',value:sub.name,sub,sortOrder:sub.sortOrder||0});
  }

  function deleteSubCategory(sub){
    setCategoryForm({mode:'deleteSub',title:'删除子分类',value:sub.name,sub,danger:true});
  }

  async function submitCategoryForm(){
    if(!categoryForm)return;
    const name=String(categoryForm.value||'').trim();
    if(!categoryForm.danger&&!name)return;
    try{
      if(categoryForm.mode==='createMain'){
        await addMainCategory({scope:categoryScope,purposeKey:categoryForm.purposeKey||'user_reference',name,sortOrder:Number(categoryForm.sortOrder||0)});
        setMsg?.('主分类已创建');
      }else if(categoryForm.mode==='renameMain'){
        if(name===categoryForm.main.name)return setCategoryForm(null);
        await saveMainCategory(categoryForm.main.id,{name,sortOrder:Number(categoryForm.sortOrder||0)});
        setMsg?.('主分类已重命名');
      }else if(categoryForm.mode==='deleteMain'){
        await saveMainCategory(categoryForm.main.id,{status:'DELETED'});
        setMsg?.('主分类已删除');
      }else if(categoryForm.mode==='createSub'){
        await addSubCategory(categoryForm.main.id,{name,sortOrder:Number(categoryForm.sortOrder||0)});
        setMsg?.('子分类已创建');
      }else if(categoryForm.mode==='renameSub'){
        if(name===categoryForm.sub.name)return setCategoryForm(null);
        await saveSubCategory(categoryForm.sub.id,{name,sortOrder:Number(categoryForm.sortOrder||0)});
        setMsg?.('子分类已重命名');
      }else if(categoryForm.mode==='deleteSub'){
        await saveSubCategory(categoryForm.sub.id,{status:'DELETED'});
        setMsg?.('子分类已删除');
      }
      setCategoryForm(null);
      loadCategories();
    }catch(e){
      setMsg?.(e.message);
    }
  }

  return {
    categoryOpen,
    setCategoryOpen,
    categoryTree,
    categoryLoading,
    categoryError,
    categoryForm,
    setCategoryForm,
    loadCategories,
    createMainCategory,
    renameMainCategory,
    deleteMainCategory,
    createSubCategory,
    renameSubCategory,
    deleteSubCategory,
    submitCategoryForm
  };
}
