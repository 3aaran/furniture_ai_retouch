import assert from'node:assert/strict';
import{describe,it}from'node:test';
import{readFileSync}from'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

describe('workflow UI contract',()=>{
  it('integrates real admin paths and navigation',()=>{
    assert.match(read('../../App.jsx'),/redirectLegacyWorkflowPath/);
    assert.match(read('../../AppShell.jsx'),/WorkflowAdminApp/);
    assert.match(read('../../AppShell.jsx'),/parseWorkflowHash/);
    assert.match(read('../../App.jsx'),/import\.meta\.env\.DEV/);
    assert.match(read('../../config/pageRegistry.jsx'),/工作流管理/);
    assert.match(read('../../AppShell.jsx'),/navigateWorkflow/);
  });
  it('provides list management actions',()=>{
    const source=read('./WorkflowListPage.jsx');
    for(const text of['新建工作流','编辑','复制','发布','停用','删除','后台数据库'])assert.match(source,new RegExp(text));
    assert.match(source,/workflowRepository\.list/);
  });
  it('provides React Flow canvas controls for the three-node editor',()=>{
    const canvas=read('./WorkflowCanvas.jsx'),node=read('./WorkflowNode.jsx'),library=read('./NodeLibrary.jsx');
    for(const token of['ReactFlow','Controls','Background','onConnect','onDrop','运行规则'])assert.match(canvas,new RegExp(token));
    assert.match(node,/Handle/);
    assert.match(node,/INPUT_NODE/);
    assert.match(node,/MODEL_NODE/);
    assert.match(node,/OUTPUT_NODE/);
    assert.match(library,/FIXED_NODE_TYPES/);
    assert.match(library,/仅包含三种节点/);
  });
  it('provides all three-node configuration and toolbar controls',()=>{
    const panel=read('./NodeConfigPanel.jsx'),editor=read('./WorkflowEditorPage.jsx'),node=read('./WorkflowNode.jsx');
    for(const text of['节点配置 - 输入节点','文本输入','图片输入','视频输入','音频输入','是否必填','输入标题','占位提示','最大上传数量','输入名称'])assert.match(panel,new RegExp(text));
    for(const text of['节点配置 -','模型类型','文本模型','图片模型','视频模型','音频模型','使用方式','自定义','调用预设','预设能力','输入来源','系统提示词','生成参数','输出内容'])assert.match(panel,new RegExp(text));
    for(const text of['图片比例','图片数量','视频比例','视频时长','输出长度','输出格式','音频格式','音频时长','音色选择','语速'])assert.match(panel,new RegExp(text));
    for(const text of['节点配置 - 输出节点','输出内容选择','单结果处理方式','多结果处理方式','保存到资源库','写入历史任务'])assert.match(panel,new RegExp(text));
    for(const text of['保存','运行测试','返回'])assert.match(editor,new RegExp(text));
    assert.match(editor,/workflow\.name/);
    assert.match(node,/getWorkflowNodeDisplayLines/);
    assert.match(node,/getWorkflowNodeTitleLines/);
    assert.match(editor,/createBlankWorkflow/);
    assert.doesNotMatch(editor,/createDefaultWorkflow/);
  });
  it('loads the balanced three-panel workflow styles',()=>{
    const index=read('../../styles/index.css'),css=read('../../styles/pages/admin-workflows.css');
    assert.match(index,/admin-workflows\.css/);
    assert.doesNotMatch(css,/\.workflowAdminTopbar/);
    assert.match(css,/height:calc\(var\(--app-zoomed-viewport-height,100vh\) - 78px\)/);
    assert.match(css,/\.workflowEditorLayout/);
    assert.match(css,/grid-template-columns:260px minmax\(0,1fr\) 380px/);
    assert.match(css,/\.threeNodeCanvas/);
    assert.match(css,/\.threeNodeCard/);
    assert.match(css,/\.workflowRuleBox/);
    assert.match(css,/\.workflowSegmented/);
    assert.match(css,/@media\(max-width:1100px\)/);
    assert.match(css,/grid-template-rows:minmax\(0,3fr\) minmax\(220px,2fr\)/);
    assert.match(css,/\.workflowConfigPanel\{position:static;width:auto/);
    const themedLayoutIndex=css.lastIndexOf('.workflowEditorLayout{grid-template-columns:260px minmax(0,1fr) 380px');
    const tabletLayoutIndex=css.lastIndexOf('@media(max-width:1100px)');
    const mobileLayoutIndex=css.lastIndexOf('@media(max-width:760px)');
    assert.ok(tabletLayoutIndex>themedLayoutIndex,'compact workflow layout must override the themed three-column layout');
    assert.ok(mobileLayoutIndex>themedLayoutIndex,'mobile workflow layout must override the themed three-column layout');
    assert.match(css,/\.topApp \.workflowNodeLibrary,\s*\.topApp \.workflowConfigPanel\{display:block!important\}/);
  });
});
