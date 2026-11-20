import { api } from '../api/client.js';

// Shrink photos before upload so free storage lasts longer
export async function compressImage(file, { maxSize = 1000, quality = 0.8 } = {}) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Compression failed'))), 'image/webp', quality),
  );
}

export async function uploadImage(file, purpose) {
  const blob = await compressImage(file);
  const { uploadUrl, fields } = await api('/uploads/sign', { method: 'POST', body: { purpose } });
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append('file', blob, 'image.webp');
  const res = await fetch(uploadUrl, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Image upload failed');
  const data = await res.json();
  return data.secure_url;
}
