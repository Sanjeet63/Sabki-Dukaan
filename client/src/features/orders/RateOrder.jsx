import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import { ErrorMessage, StarInput } from '../../components/ui.jsx';

// Shown to the customer once the order is picked up or delivered
export function RateOrderCard({ order }) {
  const queryClient = useQueryClient();
  const rate = useMutation({
    mutationFn: (stars) => api(`/orders/${order.id}/rating`, { method: 'PUT', body: { stars } }),
    onSuccess: ({ rating }) => {
      queryClient.setQueryData(['order', order.id], (o) => (o ? { ...o, rating: rating.stars } : o));
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['shop'] });
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      toast.success(order.rating ? 'Rating updated' : 'Thanks for rating!');
    },
  });
  if (!order.canRate) return null;
  const rated = Boolean(order.rating);

  return (
    <section className="rounded-3xl bg-white p-5 shadow-soft">
      <p className="eyebrow text-brand-600">{rated ? 'Your rating' : 'How was it?'}</p>
      <h2 className="mt-1 text-lg font-extrabold">{rated ? `You rated ${order.shop.name}` : `Rate ${order.shop.name}`}</h2>
      <p className="mb-3 text-sm text-ink-500">{rated ? 'Tap a star to change it.' : 'Your stars help neighbours pick good shops.'}</p>
      <StarInput value={rate.isPending ? rate.variables : order.rating} disabled={rate.isPending} onChange={(n) => rate.mutate(n)} />
      <ErrorMessage error={rate.error} />
    </section>
  );
}
