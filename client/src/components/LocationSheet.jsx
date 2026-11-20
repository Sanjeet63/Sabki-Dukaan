import { LocateFixed, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUserLocation } from '../lib/useUserLocation.jsx';
import { Modal } from './Dialog.jsx';
import LocationPicker from './LocationPicker.jsx';

export default function LocationSheet({ open, onClose }) {
  const loc = useUserLocation();
  const [draft, setDraft] = useState(loc.location);

  useEffect(() => {
    if (open) setDraft(loc.location);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fillFromGps() {
    const ok = await loc.detect();
    if (ok) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose your location"
      description="We will show shops near this location"
      size="max-w-xl"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!draft}
            onClick={() => {
              loc.setLocation(draft);
              onClose();
            }}
          >
            <MapPin className="h-4 w-4" /> Confirm location
          </button>
        </>
      }
    >
      <button
        className="flex w-full items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-left transition hover:bg-brand-100"
        onClick={fillFromGps}
        disabled={loc.status === 'loading'}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
          <LocateFixed className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-brand-800">
            {loc.status === 'loading' ? 'Finding your location...' : 'Use my current location'}
          </span>
          <span className="block text-xs text-brand-700/80">Most accurate, uses GPS</span>
        </span>
      </button>
      {loc.error && <p className="mt-2 text-sm text-red-600">{loc.error}</p>}

      <div className="my-4 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-ink-400">
        <span className="h-px flex-1 bg-ink-200" /> or pick on the map <span className="h-px flex-1 bg-ink-200" />
      </div>
      <LocationPicker value={draft} onChange={setDraft} height={300} />
      <p className="hint">Click on the map or drag the pin.</p>
    </Modal>
  );
}
