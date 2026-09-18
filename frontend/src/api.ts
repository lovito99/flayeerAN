import { API_URL } from '@/config';
import type { Crop, Format, Mode } from '@/types';

type ProjectPayload = {
  title: string;
  honorific: string;
  role: string;
  subtitle: string;
  tagline: string;
  district: string;
  accent: string;
  position: number;
  crop: Crop;
};

type SaveProjectParams = ProjectPayload & {
  projectId: string | null;
  format: Format;
  mode: Mode;
  width: number;
  height: number;
};

type ProjectResponse = {
  id: string;
};

type AssetResponse = {
  url: string;
  kind: 'image' | 'video';
  filename: string;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'No se pudo completar la operacion');
  }

  return body as T;
}

export async function saveProject(params: SaveProjectParams) {
  const { projectId, format, mode, width, height, title, honorific, role, subtitle, tagline, district, accent, position, crop } = params;

  return request<ProjectResponse>(`${API_URL}/api/projects${projectId ? `/${projectId}` : ''}`, {
    method: projectId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: title || 'Nuevo flyer',
      format,
      width,
      height,
      mode,
      config: { title, honorific, role, subtitle, tagline, district, accent, position, crop }
    })
  });
}

export async function uploadProjectAsset(projectId: string, file: File) {
  const data = new FormData();
  data.append('file', file);

  return request<AssetResponse>(`${API_URL}/api/projects/${projectId}/assets`, {
    method: 'POST',
    body: data
  });
}

export function assetUrl(path: string) {
  return `${API_URL}${path}`;
}
