import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Clock, MapPin, Store } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import Logo from '../../components/Logo.jsx';
import UserMenu from '../../components/UserMenu.jsx';
import { ErrorMessage, Spinner } from '../../components/ui.jsx';
import { useMyShop } from '../../lib/queries.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { BasicsFields, LocationFields, TimingFields, initialShopForm, toShopPayload, validateStep } from './ShopFields.jsx';

const STEPS = [
  { id: 'basics', title: 'Shop details', subtitle: 'Tell customers about your shop', icon: Store },
  { id: 'location', title: 'Location', subtitle: 'Where can customers find you?', icon: MapPin },
  { id: 'timing', title: 'Timings & photo', subtitle: 'When are you open?', icon: Clock },
];

export default function SellerOnboardingPage() {
  const myShop = useMyShop();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(() => initialShopForm());
  const [stepError, setStepError] = useState(null);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const register = useMutation({
    mutationFn: () => api('/seller/shops', { method: 'POST', body: toShopPayload(form) }),
    onSuccess: async () => {
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ['my-shops'] });
      toast.success('Shop registered!', { description: 'We will review and make it live soon.' });
      navigate('/seller', { replace: true });
    },
  });

  if (myShop.isLoading) return <Spinner className="min-h-screen" />;
  if (myShop.data) return <Navigate to="/seller" replace />;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  function next() {
    const error = validateStep(form, step.id);
    setStepError(error);
    if (error) return;
    if (isLast) register.mutate();
    else setStepIndex((i) => i + 1);
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="bg-ink-900 text-white">
        <div className="awning" style={{ '--awning-a': 'var(--color-brand-500)', '--awning-b': 'var(--color-marigold-300)' }} />
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 pt-6 pb-4">
          <Logo to="/" subtitle="Seller registration" light />
          <UserMenu compact />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Register your shop</h1>
          <p className="mt-1 text-ink-500">Takes about 2 minutes. It's completely free.</p>
        </div>

        <ol className="mb-8 grid grid-cols-3 gap-2">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={i > stepIndex}
                  onClick={() => setStepIndex(i)}
                  className="flex w-full flex-col gap-2 text-left disabled:cursor-default"
                >
                  <span className={`h-1.5 rounded-full ${done || active ? 'bg-brand-600' : 'bg-ink-200'}`} />
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        done ? 'bg-brand-600 text-white' : active ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-400'
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className={`hidden text-sm font-semibold sm:block ${active || done ? 'text-ink-900' : 'text-ink-400'}`}>{s.title}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="card overflow-hidden">
          <div className="flex items-center gap-4 border-b border-ink-100 px-6 py-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <step.icon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold">{step.title}</h2>
              <p className="text-sm text-ink-500">{step.subtitle}</p>
            </div>
          </div>

          <div className="p-6">
            {step.id === 'basics' && <BasicsFields form={form} set={set} />}
            {step.id === 'location' && <LocationFields form={form} set={set} />}
            {step.id === 'timing' && <TimingFields form={form} set={set} />}
            <div className="mt-6 space-y-3">
              <ErrorMessage error={stepError ?? register.error} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-ink-100 bg-ink-50/60 px-6 py-4">
            {stepIndex > 0 ? (
              <button type="button" className="btn btn-ghost" onClick={() => setStepIndex((i) => i - 1)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <Link to="/" className="btn btn-ghost">
                Cancel
              </Link>
            )}
            <button type="button" className="btn btn-primary" disabled={register.isPending} onClick={next}>
              {isLast ? (register.isPending ? 'Submitting...' : 'Submit for review') : 'Continue'}
              {!isLast && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
