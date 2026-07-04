import {http} from '../../../shared/api/http.js';

export function fetchCategoryTree(scope){
  const value=encodeURIComponent(scope || 'USER');
  return http.get('/api/categories/tree?scope=' + value);
}

export function addMainCategory(payload){
  return http.post('/api/categories/main',payload);
}

export function saveMainCategory(id,payload){
  return http.patch('/api/categories/main/' + id,payload);
}

export function addSubCategory(mainId,payload){
  return http.post('/api/categories/' + mainId + '/sub',payload);
}

export function saveSubCategory(id,payload){
  return http.patch('/api/categories/sub/' + id,payload);
}
