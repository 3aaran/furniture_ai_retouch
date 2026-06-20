import assert from 'node:assert/strict';
import {describe,it} from 'node:test';
import{buildWorkflowPath,parseWorkflowPath}from'./workflowRoute.js';

describe('workflow pathname routing',()=>{
  it('recognizes list create and edit routes',()=>{
    assert.deepEqual(parseWorkflowPath('/admin/workflows'),{name:'list',id:null});
    assert.deepEqual(parseWorkflowPath('/admin/workflows/'),{name:'list',id:null});
    assert.deepEqual(parseWorkflowPath('/admin/workflows/create'),{name:'create',id:null});
    assert.deepEqual(parseWorkflowPath('/admin/workflows/wf-123/edit'),{name:'edit',id:'wf-123'});
  });
  it('rejects unrelated paths',()=>{
    assert.equal(parseWorkflowPath('/'),null);
    assert.equal(parseWorkflowPath('/admin/workflows/wf-123'),null);
  });
  it('builds encoded paths',()=>{
    assert.equal(buildWorkflowPath('list'),'/admin/workflows');
    assert.equal(buildWorkflowPath('create'),'/admin/workflows/create');
    assert.equal(buildWorkflowPath('edit','wf / 1'),'/admin/workflows/wf%20%2F%201/edit');
  });
});
