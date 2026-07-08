export type ResourceSpace = 'system' | 'store' | 'personal';

export type ResourceItem = {
  id: string | number;
  name: string;
  url: string;
  space: ResourceSpace;
  category?: string;
  createdAt?: string;
};
