export const deepClone=value=>JSON.parse(JSON.stringify(value));
export function buildExecutionJson(workflow){
  return{template:{id:workflow.id,code:workflow.code,name:workflow.name,type:workflow.type,scene:workflow.scene,version:workflow.version},graph:deepClone(workflow.canvasJson),execution:{schemaVersion:workflow.configJson.schemaVersion,entryNodeId:workflow.configJson.entryNodeId,mode:workflow.configJson.executionMode}};
}
