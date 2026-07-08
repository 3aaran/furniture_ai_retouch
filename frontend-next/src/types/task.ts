export type StudioFeature = 'main_image' | 'material_replace' | 'scene_blend' | 'poster' | 'video';
export type TaskStatus = 'pending' | 'running' | 'success' | 'failed';

export type StudioGeneratePayload = {
  feature: StudioFeature;
  prompt?: string;
  imageIds: Array<string | number>;
  referenceIds?: Array<string | number>;
  resolution: '2K' | '4K';
  ratio: 'auto' | '1:1' | '4:3' | '16:9';
};

export type GenerateTask = {
  id: string | number;
  feature: StudioFeature;
  status: TaskStatus;
  coverUrl?: string;
  resultUrl?: string;
  createdAt: string;
  cost?: number;
};
