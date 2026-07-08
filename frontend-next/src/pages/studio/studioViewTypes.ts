import type { AiTask } from '../../services/studio.api';

export type StudioLocalImage = {
  id: string;
  imageId?: string;
  name: string;
  url: string;
  status: 'ready' | 'uploading' | 'failed';
};

export type StudioRecentTask = {
  id: string;
  feature: string;
  status: string;
  resolution: string;
  ratio: string;
  time: string;
  previewUrl?: string;
  raw?: AiTask;
};
