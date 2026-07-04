import {req,reqForm} from '../../appShared.jsx';

export const http = {
  get(path){
    return req(path);
  },
  post(path,body){
    return req(path,{method:'POST',body:JSON.stringify(body||{})});
  },
  patch(path,body){
    return req(path,{method:'PATCH',body:JSON.stringify(body||{})});
  },
  delete(path){
    return req(path,{method:'DELETE'});
  },
  form(path,formData){
    return reqForm(path,formData);
  }
};

export {req,reqForm};
