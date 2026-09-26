export type Format = 'facebook' | 'tiktok';
export type Mode = 'minimal' | 'optimized' | 'diagonal' | 'editorial' | 'soft';

export type Asset = {
  id: string;
  url: string;
  kind: 'image' | 'video';
  filename: string;
};

export type Template = {
  label: string;
  kind: 'image' | 'video';
  width: number;
  height: number;
  ratio: string;
  accept: string;
  files: string;
  maxSizeMb: number;
  recommendation: string;
};

export type StyleOption = {
  value: Mode;
  label: string;
  description: string;
  facebookOnly?: boolean;
};

export type Crop = {
  x: number;
  y: number;
  zoom: number;
};
