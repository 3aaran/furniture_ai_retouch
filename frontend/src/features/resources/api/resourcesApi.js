import {http} from '../../../shared/api/http.js';

function withQuery(path,params){
  const query=new URLSearchParams(params||{}).toString();
  return query ? path + '?' + query : path;
}

function resourceBase(isSystemAdmin=false){
  return isSystemAdmin ? '/api/admin/resources' : '/api/merchant/resources';
}

export function fetchMerchantResources(params){
  return http.get(withQuery('/api/merchant/resources',params));
}

export function fetchPublicResources(params){
  return http.get(withQuery('/api/resources',params));
}

export function fetchAdminResources(params){
  return http.get(withQuery('/api/admin/resources',params));
}

export function fetchResourceDetail(id){
  return http.get('/api/resources/' + id + '/detail');
}

export function uploadResource(formData,{isSystemAdmin=false}={}){
  return http.form(resourceBase(isSystemAdmin),formData);
}

export function updateResource(id,payload,{isSystemAdmin=false}={}){
  return http.patch(resourceBase(isSystemAdmin) + '/' + id,payload);
}

export function deleteResource(id,{isSystemAdmin=false}={}){
  return http.delete(resourceBase(isSystemAdmin) + '/' + id);
}

export const uploadMerchantResource=uploadResource;
export const updateMerchantResource=updateResource;
export const deleteMerchantResource=deleteResource;
