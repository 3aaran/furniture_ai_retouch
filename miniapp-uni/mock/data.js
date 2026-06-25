export const homeEntries = [
  { key: 'retouch', title: '家具 AI 修图', desc: '上传家具原图，快速生成干净、真实的商品图。', action: '开始修图' },
  { key: 'main', title: '家具主图', desc: '适合电商首图，突出主体、光影和空间感。', action: '生成主图' },
  { key: 'poster', title: '家具海报', desc: '生成带营销氛围的海报图，适合活动投放。', action: '制作海报' },
  { key: 'video', title: '家具宣传视频', desc: '预览视频创意方向，后续接入真实生成能力。', action: '创建视频' }
];

export const generationTypes = [
  { key: 'main', title: '家具主图', desc: '主体居中、背景干净、适合商品首图。', cost: 8 },
  { key: 'detail', title: '细节图', desc: '突出材质纹理、边角工艺和局部质感。', cost: 6 },
  { key: 'poster', title: '海报图', desc: '保留文案留白，适合活动、上新和促销。', cost: 10 },
  { key: 'video', title: '宣传视频', desc: '模拟生成视频分镜，展示产品卖点。', cost: 18 }
];

export const mockTasks = [
  { id: 'T20260625001', title: '北欧布艺沙发主图', type: '家具主图', status: 'waiting', statusText: '等待中', time: '今天 09:12', progress: 12, coverText: '沙发主图' },
  { id: 'T20260625002', title: '胡桃木餐桌细节图', type: '细节图', status: 'running', statusText: '生成中', time: '今天 09:26', progress: 58, coverText: '木纹细节' },
  { id: 'T20260624018', title: '单人椅春季上新海报', type: '海报图', status: 'success', statusText: '成功', time: '昨天 18:40', progress: 100, coverText: '上新海报' },
  { id: 'T20260624009', title: '床垫宣传短视频', type: '宣传视频', status: 'failed', statusText: '失败', time: '昨天 11:08', progress: 100, coverText: '视频草稿' }
];

export const resourceItems = [
  { id: 'R001', title: '浅灰客厅场景', type: 'image', typeText: '图片', tag: '场景模板', desc: '适合沙发、茶几和电视柜主图。' },
  { id: 'R002', title: '胡桃木材质参考', type: 'image', typeText: '图片', tag: '材质', desc: '适合餐桌、书柜、边柜细节生成。' },
  { id: 'R003', title: '春季上新视频脚本', type: 'video', typeText: '视频', tag: '宣传视频', desc: '含开场、产品特写和收尾镜头。' },
  { id: 'R004', title: '高级灰海报版式', type: 'image', typeText: '图片', tag: '海报参考', desc: '适合活动价、品牌介绍和卖点排版。' },
  { id: 'R005', title: '多角度产品展示', type: 'video', typeText: '视频', tag: '视频参考', desc: '用于展示家具正面、侧面和局部细节。' }
];

export const mockUser = {
  name: '许店长',
  role: '门店管理员',
  company: '寻港家居旗舰店',
  phone: '138****2688',
  quota: 860,
  usedToday: 42,
  storage: '1.8GB / 5GB'
};
