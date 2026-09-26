import axios from 'axios';
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
  id: string;
  url: string;
  kind: 'image' | 'video';
  filename: string;
};

function progressPercent(loaded: number, total?: number) {
  if (!total) return null;
  return Math.round((loaded / total) * 100);
}

function apiError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error;
    if (typeof message === 'string') return new Error(message);
  }

  return error instanceof Error ? error : new Error(fallback);
}

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

export async function uploadProjectAsset(projectId: string, file: File, onProgress?: (progress: number) => void) {
  const data = new FormData();
  data.append('file', file);

  try {
    const response = await axios.post<AssetResponse>(`${API_URL}/api/projects/${projectId}/assets`, data, {
      onUploadProgress: event => {
        const percent = progressPercent(event.loaded, event.total);
        if (percent !== null) onProgress?.(percent);
      }
    });

    onProgress?.(100);
    return response.data;
  } catch (error) {
    throw apiError(error, 'No se pudo subir el archivo');
  }
}

export async function deleteProjectAsset(projectId: string, assetId: string) {
  await request<{ ok: true }>(`${API_URL}/api/projects/${projectId}/assets/${assetId}`, {
    method: 'DELETE'
  });
}

export function assetUrl(path: string) {
  return `${API_URL}${path}`;
}
