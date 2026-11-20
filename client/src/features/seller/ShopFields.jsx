import { LocateFixed } from 'lucide-react';
import { useState } from 'react';
import ImageInput from '../../components/ImageInput.jsx';
import LocationPicker from '../../components/LocationPicker.jsx';
import { useCategories } from '../../lib/queries.js';

export function initialShopForm(shop) {
  return {
    name: shop?.name ?? '',
    categoryId: shop?.category.id ?? '',
    description: shop?.description ?? '',
    phone: shop?.phone ?? '',
    addressLine: shop?.addressLine ?? '',
    area: shop?.area ?? '',
    city: shop?.city ?? '',
    pincode: shop?.pincode ?? '',
    openingTime: shop?.openingTime ?? '09:00',
    closingTime: shop?.closingTime ?? '21:00',
    coverImageUrl: shop?.coverImageUrl ?? null,
    location: shop ? { lat: shop.latitude, lng: shop.longitude } : null,
  };
}

export function toShopPayload(form) {
  const { location, ...rest } = form;
  return {
    ...rest,
    categoryId: Number(rest.categoryId),
    description: rest.description || null,
    area: rest.area || null,
    openingTime: rest.openingTime || null,
    closingTime: rest.closingTime || null,
    latitude: location.lat,
    longitude: location.lng,
  };
}

export function validateStep(form, step) {
  if (step === 'basics') {
    if (form.name.trim().length < 2) return 'Enter your shop name';
    if (!form.categoryId) return 'Choose a category';
    if (!/^[6-9]\d{9}$/.test(form.phone)) return 'Enter a valid 10-digit mobile number';
  }
  if (step === 'location') {
    if (form.addressLine.trim().length < 5) return 'Enter the full address';
    if (form.city.trim().length < 2) return 'Enter the city';
    if (!/^\d{6}$/.test(form.pincode)) return 'Enter a valid 6-digit pincode';
    if (!form.location) return 'Pin your shop location on the map';
  }
  return null;
}

export function BasicsFields({ form, set }) {
  const categories = useCategories();
  return (
    <div className="space-y-5">
      <div>
        <label className="label">Shop name *</label>
        <input className="input" placeholder="e.g. Sharma General Store" value={form.name} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div>
        <label className="label">Category *</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.data?.map((c) => {
            const active = Number(form.categoryId) === c.id;
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => set('categoryId', c.id)}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                  active ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-200' : 'border-ink-200 bg-white text-ink-700 hover:border-brand-200'
                }`}
              >
                <span className="text-xl">{c.icon}</span>
                <span className="leading-tight">{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="label">Shop phone number *</label>
        <div className="flex">
          <span className="inline-flex items-center rounded-l-xl border border-r-0 border-ink-200 bg-ink-50 px-3 text-sm text-ink-500">+91</span>
          <input
            className="input rounded-l-none"
            inputMode="numeric"
            maxLength={10}
            placeholder="9876543210"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <p className="hint">Customers will call this number for queries.</p>
      </div>
      <div>
        <label className="label">About your shop</label>
        <textarea
          className="input"
          rows={3}
          maxLength={1000}
          placeholder="What do you sell? Any speciality?"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>
    </div>
  );
}

export function LocationFields({ form, set }) {
  const [gpsError, setGpsError] = useState(null);
  function fillFromGps() {
    setGpsError(null);
    navigator.geolocation?.getCurrentPosition(
      (p) => set('location', { lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setGpsError('Could not get your location. Please click on the map instead.'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }
  return (
    <div className="space-y-5">
      <div>
        <label className="label">Address *</label>
        <input className="input" placeholder="Shop no., street, landmark" value={form.addressLine} onChange={(e) => set('addressLine', e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Area / Locality</label>
          <input className="input" value={form.area} onChange={(e) => set('area', e.target.value)} />
        </div>
        <div>
          <label className="label">City *</label>
          <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
        </div>
        <div>
          <label className="label">Pincode *</label>
          <input
            className="input"
            inputMode="numeric"
            maxLength={6}
            value={form.pincode}
            onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))}
          />
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <label className="label mb-0">Exact location on map *</label>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fillFromGps}>
            <LocateFixed className="h-4 w-4" /> Use my current location
          </button>
        </div>
        <LocationPicker value={form.location} onChange={(loc) => set('location', loc)} height={320} />
        <p className="hint">{gpsError ?? 'Customers will see distance and directions based on this pin. Click the map or drag the pin.'}</p>
      </div>
    </div>
  );
}

export function TimingFields({ form, set }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Opens at</label>
          <input className="input" type="time" value={form.openingTime ?? ''} onChange={(e) => set('openingTime', e.target.value)} />
        </div>
        <div>
          <label className="label">Closes at</label>
          <input className="input" type="time" value={form.closingTime ?? ''} onChange={(e) => set('closingTime', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Shop photo</label>
        <ImageInput purpose="shop" aspect="aspect-video" className="w-full sm:w-56" value={form.coverImageUrl} onChange={(url) => set('coverImageUrl', url)} />
        <p className="hint">A clear photo of your shop front helps customers find you.</p>
      </div>
    </div>
  );
}
