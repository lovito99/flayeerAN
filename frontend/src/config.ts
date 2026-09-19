import type { Format, StyleOption, Template } from '@/types';

const appBasePath = import.meta.env.BASE_URL;
const apiUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '');

function publicAsset(path: string) {
  return `${appBasePath}${path.replace(/^\//, '')}`;
}

export const CASCO_ICON = publicAsset('casco-an.jpg');

export const CASCOS = [
  'Gobernador regional',
  'Consejero regional',
  'Alcalde provincial',
  'Alcalde distrital'
];

export const API_URL = apiUrl;

export const TEMPLATES: Record<Format, Template> = {
  facebook: {
    label: 'Imagen para Facebook',
    kind: 'image',
    width: 1080,
    height: 1350,
    ratio: '4:5',
    accept: 'image/jpeg,image/png,image/webp',
    files: 'JPG, PNG o WebP'
  },
  tiktok: {
    label: 'Video para TikTok',
    kind: 'video',
    width: 1080,
    height: 1920,
    ratio: '9:16',
    accept: 'video/mp4,video/webm',
    files: 'MP4 o WebM'
  }
};

export const STYLE_OPTIONS: StyleOption[] = [
  { value: 'minimal', label: 'Minimal', description: 'Rojo, blanco y aire visual' },
  { value: 'diagonal', label: 'Diagonal', description: 'Corte dinamico inferior', facebookOnly: true },
  { value: 'editorial', label: 'Editorial', description: 'Bloque blanco y acentos rojos', facebookOnly: true },
  { value: 'soft', label: 'Tarjeta', description: 'Composicion compacta', facebookOnly: true },
  { value: 'optimized', label: 'Optimizada', description: 'Mas espacio para el contenido' }
];
