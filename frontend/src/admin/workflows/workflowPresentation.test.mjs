import assert from 'node:assert/strict';
import {describe,it} from 'node:test';
import {createBlankWorkflow} from './workflowDefinitions.js';
import {getWorkflowNodeDisplayLines,getWorkflowNodeTitleLines} from './workflowPresentation.js';

describe('workflow node presentation',()=>{
  it('derives model card content from the current node configuration',()=>{
    const workflow=createBlankWorkflow({id:'presentation-test'});
    const node=workflow.canvasJson.nodes.find(item=>item.data.label==='生成产品主图');
    node.data.label='生成白底主图';
    node.data.config={
      ...node.data.config,
      modelType:'图片模型',
      usageMode:'调用预设',
      preset:'背景融合图',
      model:'高清图片模型',
      inputs:['主图','补充提示词'],
      output:'白底主图'
    };

    assert.deepEqual(getWorkflowNodeTitleLines(node.data),['第2步：大模型节点','生成白底主图']);
    assert.deepEqual(getWorkflowNodeDisplayLines(node.data),[
      '模型类型：图片模型',
      '使用方式：调用预设',
      '预设能力：背景融合图',
      '模型：高清图片模型',
      '输入：主图、补充提示词',
      '输出：白底主图'
    ]);
  });

  it('derives input and output summaries from toggles and selections',()=>{
    const workflow=createBlankWorkflow({id:'presentation-input-output'});
    const input=workflow.canvasJson.nodes.find(item=>item.data.nodeType==='INPUT_NODE');
    const output=workflow.canvasJson.nodes.find(item=>item.data.nodeType==='OUTPUT_NODE');
    input.data.config.text.title='文本';
    input.data.config.image.names=['主图'];
    input.data.config.video.enabled=true;
    output.data.config.outputs=['产品主图'];
    output.data.config.multiResult=['支持打包下载'];

    assert.match(getWorkflowNodeDisplayLines(input.data).join('\n'),/视频：开启/);
    assert.match(getWorkflowNodeDisplayLines(input.data).join('\n'),/输入内容：文本、主图、视频/);
    assert.match(getWorkflowNodeDisplayLines(output.data).join('\n'),/输出内容：产品主图/);
    assert.match(getWorkflowNodeDisplayLines(output.data).join('\n'),/多结果：支持打包下载/);
  });
});
