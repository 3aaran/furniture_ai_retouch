import assert from'node:assert/strict';
import{describe,it}from'node:test';
import{readFileSync}from'node:fs';
import{createDefaultWorkflow}from'./workflowDefinitions.js';
import{buildExecutionJson}from'./workflowSerialization.js';

describe('workflow serialization',()=>{
  it('builds execution JSON',()=>{
    const json=buildExecutionJson(createDefaultWorkflow({id:'wf-1'}));
    assert.equal(json.template.id,'wf-1');assert.equal(json.execution.mode,'SEQUENTIAL');assert.equal('versions'in json,false);
  });
  it('does not create frontend version snapshots',()=>{
    const source=readFileSync(new URL('./workflowSerialization.js',import.meta.url),'utf8');
    assert.doesNotMatch(source,/createPublishedWorkflow|versions\.push|ARCHIVED/);
  });
});
