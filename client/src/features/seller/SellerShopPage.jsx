import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bike, Clock, ExternalLink, MapPin, QrCode, Store } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useOutletContext, useParams } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import { ErrorMessage, MenuRow, PageHeader } from '../../components/ui.jsx';
import { ShopOpenToggle } from '../../layouts/SellerLayout.jsx';
import { deliverySummary } from '../../lib/delivery.js';
import { formatTime12 } from '../../lib/format.js';
import { DeliveryFields, initialDeliveryForm, toDeliveryPayload, validateDelivery } from './DeliveryFields.jsx';
import { BasicsFields, LocationFields, TimingFields, initialShopForm, toShopPayload, validateStep } from './ShopFields.jsx';

const SECTIONS = {
  details: {
    icon: Store,
    title: 'Shop details',
    subtitle: 'Name, category, phone and description',
    Fields: BasicsFields,
    step: 'basics',
    hint: (s) => `${s.name} · ${s.category.name}`,
  },
  location: {
    icon: MapPin,
    title: 'Address & location',
    subtitle: 'Where customers can find you',
    Fields: LocationFields,
    step: 'location',
    hint: (s) => [s.addressLine, s.area, s.city].filter(Boolean).join(', '),
  },
  timings: {
    icon: Clock,
    title: 'Timings & photo',
    subtitle: 'Opening hours and shop photo',
    Fields: TimingFields,
    step: null,
    hint: (s) => (s.openingTime ? `${formatTime12(s.openingTime)} – ${formatTime12(s.closingTime)}` : 'Set your opening hours'),
  },
  delivery: {
    icon: Bike,
    title: 'Delivery',
    subtitle: 'Do you deliver? Set your fee and area',
    Fields: DeliveryFields,
    initial: initialDeliveryForm,
    toPayload: toDeliveryPayload,
    validate: validateDelivery,
    hint: (s) => (s.delivery.enabled ? deliverySummary(s.delivery) : 'Off · pickup only'),
  },
};

// Settings menu: each row opens its own edit screen
export default function SellerShopPage() {
  const { shop } = useOutletContext();
  const entries = Object.entries(SECTIONS);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Shop settings" subtitle="Tap a section to edit it" />

      <section className="overflow-hidden rounded-3xl bg-white shadow-soft">
        {entries.map(([key, s], i) => (
          <div key={key}>
            {i > 0 && <div className="mx-4 h-px bg-ink-100" />}
            <MenuRow as={Link} to={`/seller/shop/${key}`} icon={s.icon} label={s.title} hint={s.hint(shop)} />
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-soft">
        <ShopOpenToggle shop={shop} />
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-soft">
        <MenuRow as={Link} to="/seller/share" icon={QrCode} label="Share your shop" hint="Link, WhatsApp and QR poster" />
        {shop.status === 'active' && (
          <>
            <div className="mx-4 h-px bg-ink-100" />
            <MenuRow as={Link} to={`/s/${shop.slug}`} icon={ExternalLink} label="View my shop page" hint="See it the way customers do" />
          </>
        )}
      </section>
    </div>
  );
}

export function SellerShopSectionPage() {
  const { shop } = useOutletContext();
  const { section } = useParams();
  const config = SECTIONS[section];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => (config?.initial ?? initialShopForm)(shop));
  const [error, setError] = useState(null);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: () => api(`/seller/shops/${shop.id}`, { method: 'PATCH', body: (config.toPayload ?? toShopPayload)(form) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shops'] });
      queryClient.invalidateQueries({ queryKey: ['shop'] });
      toast.success(`${config.title} saved`);
      navigate('/seller/shop');
    },
  });

  if (!config) return <Navigate to="/seller/shop" replace />;
  const { Fields } = config;

  function submit(e) {
    e.preventDefault();
    const stepError = config.validate ? config.validate(form) : config.step ? validateStep(form, config.step) : null;
    setError(stepError);
    if (!stepError) save.mutate();
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl">
      <PageHeader back="/seller/shop" title={config.title} subtitle={config.subtitle} />
      <div className="space-y-5 rounded-3xl bg-white p-5 shadow-soft md:p-6">
        <Fields form={form} set={set} />
        <ErrorMessage error={error ?? save.error} />
        <button className="btn btn-dark w-full" disabled={save.isPending}>
          {save.isPending ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
