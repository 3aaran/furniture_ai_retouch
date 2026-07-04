import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe,it} from 'node:test';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

describe('workflow shell integration',()=>{
  it('renders workflow pages inside the shared application shell',()=>{
    const app=read('../../App.jsx');
    const shell=read('../../AppShell.jsx');
    const workflow=read('./WorkflowAdminApp.jsx');

    assert.match(app,/redirectLegacyWorkflowPath/);
    assert.doesNotMatch(app,/if\(workflowRoute\)/);
    assert.match(shell,/parseWorkflowHash/);
    assert.match(shell,/WorkflowAdminApp/);
    assert.match(shell,/page==='workflows'/);
    assert.match(shell,/if\(page==='workflows'\)return/);
    assert.doesNotMatch(workflow,/<header/);
  });

  it('uses icons instead of wrapping navigation labels on compact desktop widths',()=>{
    const shell=read('../../AppShell.jsx');
    const adminNavGroup=read('../../app-shell/AdminNavGroup.jsx');
    const registry=read('../../config/pageRegistry.jsx');

    assert.match(registry,/icon:/);
    assert.match(shell,/AdminNavGroup/);
    assert.match(adminNavGroup,/navGroupLabel/);
    assert.match(adminNavGroup,/GroupIcon/);
  });
});
