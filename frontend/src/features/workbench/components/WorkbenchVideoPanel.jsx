import React from 'react';
import {Clapperboard} from 'lucide-react';

const VIDEO_PARAM_CHOICES={
  duration:['5秒','10秒','15秒','30秒'],
  ratio:['16:9','9:16','1:1','4:3','3:4'],
  quality:['标准','高清','超清'],
  camera:['固定镜头','缓慢推进','环绕展示','平移展示','拉远展示'],
  motion:['低','中等','高'],
  pace:['稳重','自然','快速'],
  subtitle:['无字幕','自动字幕','产品卖点字幕']
};

function VideoSelect({label,name,value,onChange}){
  return <label><span>{label}</span><select className="wbSelect dark" value={value} onChange={e=>onChange(name,e.target.value)}>{VIDEO_PARAM_CHOICES[name].map(item=><option key={item}>{item}</option>)}</select></label>;
}

function WorkbenchVideoPanel({
  storyboardDragging,
  setStoryboardDragging,
  dropStoryboard,
  chooseStoryboard,
  storyboards,
  removeStoryboard,
  videoPrompt,
  setVideoPrompt,
  videoParams,
  updateVideoParam
}){
  return <>
    <div className="wbMainBlock wbVideoStoryboardBlock">
      <div className="wbSourceHead">
        <div className="wbBlockTitle">分镜图片</div>
      </div>
      <label className={storyboardDragging?'wbUploadBox wbVideoUploadBox isDragging':'wbUploadBox wbVideoUploadBox'} onDragOver={e=>{e.preventDefault();setStoryboardDragging(true)}} onDragLeave={e=>{e.preventDefault();setStoryboardDragging(false)}} onDrop={dropStoryboard}>
        <input type="file" accept="image/*" multiple onChange={chooseStoryboard}/>
        <div className="wbUploadInner">
          <div className="wbUploadCircle"><Clapperboard size={30}/></div>
          <b>点击或拖动上传分镜图片</b>
          <em>支持多张图片，按上传顺序作为视频分镜参考</em>
        </div>
      </label>
      {storyboards.length>0&&<div className="wbStoryboardGrid">
        {storyboards.map((item,index)=><div className="wbStoryboardItem" key={item.id}>
          <img src={item.url} alt={`分镜 ${index+1}`} loading="lazy" decoding="async"/>
          <span>{index+1}</span>
          <button type="button" onClick={()=>removeStoryboard(item.id)}>移除</button>
        </div>)}
      </div>}
    </div>
    <div className="wbVideoPromptCard">
      <label>
        <span>视频描述</span>
        <textarea value={videoPrompt} onChange={e=>setVideoPrompt(e.target.value)} placeholder="描述镜头运动、产品卖点、场景氛围、字幕诉求等"/>
      </label>
      <div className="wbVideoParamGrid">
        <VideoSelect label="视频时长" name="duration" value={videoParams.duration} onChange={updateVideoParam}/>
        <VideoSelect label="画幅比例" name="ratio" value={videoParams.ratio} onChange={updateVideoParam}/>
        <VideoSelect label="清晰度" name="quality" value={videoParams.quality} onChange={updateVideoParam}/>
        <VideoSelect label="运镜方式" name="camera" value={videoParams.camera} onChange={updateVideoParam}/>
        <VideoSelect label="运动强度" name="motion" value={videoParams.motion} onChange={updateVideoParam}/>
        <VideoSelect label="镜头节奏" name="pace" value={videoParams.pace} onChange={updateVideoParam}/>
        <VideoSelect label="字幕" name="subtitle" value={videoParams.subtitle} onChange={updateVideoParam}/>
      </div>
    </div>
  </>;
}

export default WorkbenchVideoPanel;
