import { useQuery } from '@tanstack/react-query';
import { ImagePlus, Link2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { api } from '../api/client.js';
import { uploadImage } from '../lib/image.js';

// Uploads to Cloudinary when configured, otherwise accepts an image URL
export default function ImageInput({ value, onChange, purpose = 'product', aspect = 'aspect-square', className = 'w-32' }) {
  const config = useQuery({
    queryKey: ['upload-config'],
    queryFn: () => api('/uploads/config'),
    staleTime: Infinity,
  });
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const canUpload = Boolean(config.data?.provider);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      onChange(await uploadImage(file, purpose));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-4">
        <div className={`relative ${className} ${aspect} shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50`}>
          {value ? (
            <>
              <img src={value} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(null)}
                className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink-900/70 text-white hover:bg-ink-900"
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!canUpload || uploading}
              onClick={() => inputRef.current?.click()}
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-400 transition enabled:hover:bg-ink-100 enabled:hover:text-brand-600"
            >
              <ImagePlus className="h-7 w-7" />
              <span className="text-xs font-semibold">{uploading ? 'Uploading...' : canUpload ? 'Add photo' : 'No photo'}</span>
            </button>
          )}
        </div>

        <div className="min-w-[11rem] flex-1 space-y-2">
          {canUpload ? (
            <>
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <button type="button" className="btn btn-secondary" disabled={uploading} onClick={() => inputRef.current?.click()}>
                <ImagePlus className="h-4 w-4" />
                {uploading ? 'Uploading...' : value ? 'Change photo' : 'Upload photo'}
              </button>
              <p className="hint">JPG or PNG. We compress it automatically.</p>
            </>
          ) : (
            <>
              <div className="relative">
                <Link2 className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  className="input pl-10"
                  type="url"
                  placeholder="Paste image URL (https://...)"
                  value={value ?? ''}
                  onChange={(e) => onChange(e.target.value || null)}
                />
              </div>
              <p className="hint">Photo upload turns on once Cloudinary is configured.</p>
            </>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
