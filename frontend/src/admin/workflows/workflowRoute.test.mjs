import assert from 'node:assert/strict';
import {describe,it} from 'node:test';
import{buildWorkflowPath,parseWorkflowHash,parseWorkflowPath}from'./workflowRoute.js';

describe('workflow hash routing',()=>{
  it('recognizes list create and edit hash routes',()=>{
    assert.deepEqual(parseWorkflowHash('#/workflows'),{name:'list',id:null});
    assert.deepEqual(parseWorkflowHash('#/workflows/'),{name:'list',id:null});
    assert.deepEqual(parseWorkflowHash('#/workflows/create'),{name:'create',id:null});
    assert.deepEqual(parseWorkflowHash('#/workflows/wf-123/edit'),{name:'edit',id:'wf-123'});
  });
  it('keeps recognizing legacy pathname routes for redirects',()=>{
    assert.deepEqual(parseWorkflowPath('/admin/workflows'),{name:'list',id:null});
    assert.deepEqual(parseWorkflowPath('/admin/workflows/'),{name:'list',id:null});
    assert.deepEqual(parseWorkflowPath('/admin/workflows/create'),{name:'create',id:null});
    assert.deepEqual(parseWorkflowPath('/admin/workflows/wf-123/edit'),{name:'edit',id:'wf-123'});
  });
  it('rejects unrelated paths',()=>{
    assert.equal(parseWorkflowPath('/'),null);
    assert.equal(parseWorkflowPath('/admin/workflows/wf-123'),null);
  });
  it('builds encoded hash paths',()=>{
    assert.equal(buildWorkflowPath('list'),'#/workflows');
    assert.equal(buildWorkflowPath('create'),'#/workflows/create');
    assert.equal(buildWorkflowPath('edit','wf / 1'),'#/workflows/wf%20%2F%201/edit');
  });
});
