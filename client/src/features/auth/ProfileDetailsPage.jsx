import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import { ErrorMessage, PageHeader } from '../../components/ui.jsx';
import { useAuth } from './AuthContext.jsx';

export default function ProfileDetailsPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const dirty = name !== user.name || phone !== (user.phone ?? '');

  const save = useMutation({
    mutationFn: () => api('/users/me', { method: 'PATCH', body: { name, phone: phone || null } }),
    onSuccess: ({ user: updated }) => {
      setUser(updated);
      toast.success('Profile saved');
      navigate('/profile');
    },
  });

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader back="/profile" title="My profile" subtitle="Your name and contact number" />
      <form
        className="space-y-5 rounded-3xl bg-white p-5 shadow-soft"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div>
          <label className="label">Name</label>
          <input className="input" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input text-ink-500" value={user.email} disabled />
          <p className="hint">From your Google account. It can't be changed here.</p>
        </div>
        <div>
          <label className="label">Mobile number</label>
          <div className="flex overflow-hidden rounded-2xl border-2 border-ink-100 bg-white focus-within:border-ink-900">
            <span className="flex items-center bg-ink-50 px-3.5 text-[15px] font-bold text-ink-600">+91</span>
            <input
              className="w-full px-3 py-3 text-[15px] outline-none"
              inputMode="numeric"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <p className="hint">Shops call this number about your orders.</p>
        </div>
        <ErrorMessage error={save.error} />
        <button className="btn btn-dark w-full" disabled={save.isPending || !dirty}>
          {save.isPending ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
