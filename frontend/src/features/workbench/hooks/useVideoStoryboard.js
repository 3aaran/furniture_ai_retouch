import {useEffect,useRef,useState} from 'react';

const DEFAULT_VIDEO_PARAMS={
  duration:'10秒',
  ratio:'16:9',
  quality:'高清',
  camera:'缓慢推进',
  motion:'中等',
  pace:'稳重',
  subtitle:'无字幕'
};

export function useVideoStoryboard(){
  const [storyboards,setStoryboards]=useState([]);
  const [storyboardDragging,setStoryboardDragging]=useState(false);
  const [videoPrompt,setVideoPrompt]=useState('');
  const [videoParams,setVideoParams]=useState(DEFAULT_VIDEO_PARAMS);
  const storyboardsRef=useRef([]);

  useEffect(()=>{storyboardsRef.current=storyboards},[storyboards]);
  useEffect(()=>()=>storyboardsRef.current.forEach(item=>URL.revokeObjectURL(item.url)),[]);

  function addStoryboardFiles(files){
    const next=Array.from(files||[]).filter(file=>file?.type?.startsWith('image/')).map(file=>({
      id:`${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      url:URL.createObjectURL(file),
      name:file.name
    }));
    if(!next.length)return;
    setStoryboards(prev=>[...prev,...next].slice(0,12));
  }

  function chooseStoryboard(e){
    addStoryboardFiles(e.target.files);
    e.target.value='';
  }

  function dropStoryboard(e){
    e.preventDefault();
    setStoryboardDragging(false);
    addStoryboardFiles(e.dataTransfer?.files);
  }

  function removeStoryboard(id){
    setStoryboards(prev=>{
      const target=prev.find(item=>item.id===id);
      if(target?.url)URL.revokeObjectURL(target.url);
      return prev.filter(item=>item.id!==id);
    });
  }

  function updateVideoParam(key,value){
    setVideoParams(prev=>({...prev,[key]:value}));
  }

  return {
    storyboards,
    setStoryboards,
    storyboardDragging,
    setStoryboardDragging,
    videoPrompt,
    setVideoPrompt,
    videoParams,
    setVideoParams,
    chooseStoryboard,
    dropStoryboard,
    removeStoryboard,
    updateVideoParam
  };
}
