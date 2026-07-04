import {http} from '../../../shared/api/http.js';

function withQuery(path,params){
  const query=new URLSearchParams(params||{}).toString();
  return query ? path + '?' + query : path;
}

export function fetchWorkbenchResources(params){
  return http.get(withQuery('/api/resources',params));
}

export function fetchPublicSettings(){
  return http.get('/api/settings/public');
}

export function fetchWatermarkSettings(){
  return http.get('/api/watermark/settings');
}

export function fetchRecentAiTasks(params){
  return http.get(withQuery('/api/ai/tasks/recent',params));
}

export function fetchRecentImages(params){
  return http.get(withQuery('/api/images/recent',params));
}

export function fetchAiTaskStatus(taskId){
  return http.get('/api/ai/tasks/' + taskId + '/status');
}

export function createAiTask(payload){
  return http.post('/api/ai/tasks',payload);
}

export function deleteAiTask(taskId){
  return http.delete('/api/ai/tasks/' + taskId);
}

export function deleteImage(imageId){
  return http.delete('/api/images/' + imageId);
}

export function fetchImageSource(imageId){
  return http.get('/api/images/' + imageId + '/source');
}

export function fetchTaskDetail(taskId){
  return http.get('/api/ai/tasks/' + taskId);
}

export function fetchImageDetail(imageId){
  return http.get('/api/images/' + imageId + '/detail-rich');
}

export function uploadImage(formData){
  return http.form('/api/images/upload',formData);
}

export function uploadWorkbenchResource(formData){
  return http.form('/api/merchant/resources',formData);
}
