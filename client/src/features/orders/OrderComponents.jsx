import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bike, Check, CheckCircle2, Clock, Footprints, PackageCheck, ShoppingBag, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import { useConfirm } from '../../components/Dialog.jsx';
import { Badge, ErrorMessage } from '../../components/ui.jsx';
import { ORDER_STATUS_LABEL, formatPaise } from '../../lib/format.js';

const STATUS_TONE = {
  PLACED: 'blue',
  ACCEPTED: 'amber',
  READY: 'green',
  PICKED_UP: 'slate',
  OUT_FOR_DELIVERY: 'violet',
  DELIVERED: 'slate',
  REJECTED: 'red',
  CANCELLED: 'red',
};

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status]}>{ORDER_STATUS_LABEL[status] ?? status}</Badge>;
}

export function FulfilmentBadge({ type }) {
  return type === 'delivery' ? (
    <Badge tone="dark" icon={Bike}>
      Delivery
    </Badge>
  ) : (
    <Badge tone="slate" icon={Footprints}>
      Pickup
    </Badge>
  );
}

const STEPS = {
  pickup: [
    { status: 'PLACED', label: 'Placed', icon: ShoppingBag },
    { status: 'ACCEPTED', label: 'Accepted', icon: Check },
    { status: 'READY', label: 'Ready', icon: PackageCheck },
    { status: 'PICKED_UP', label: 'Picked up', icon: CheckCircle2 },
  ],
  delivery: [
    { status: 'PLACED', label: 'Placed', icon: ShoppingBag },
    { status: 'ACCEPTED', label: 'Accepted', icon: Check },
    { status: 'OUT_FOR_DELIVERY', label: 'On the way', icon: Bike },
    { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
  ],
};

export function OrderStepper({ status, fulfilmentType = 'pickup' }) {
  if (status === 'REJECTED' || status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-red-700">
        <XCircle className="h-6 w-6" />
        <span className="font-semibold">{status === 'REJECTED' ? 'The shop rejected this order' : 'This order was cancelled'}</span>
      </div>
    );
  }
  const steps = STEPS[fulfilmentType] ?? STEPS.pickup;
  const current = steps.findIndex((s) => s.status === status);
  return (
    <ol className="flex items-start">
      {steps.map((step, i) => {
        const done = i <= current;
        const isCurrent = i === current;
        return (
          <li key={step.status} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span className={`absolute top-5 right-1/2 h-1 w-full -translate-y-1/2 rounded ${i <= current ? 'bg-emerald-500' : 'bg-ink-200'}`} />
            )}
            <span
              className={`relative flex h-10 w-10 items-center justify-center rounded-full ring-4 ring-white transition ${
                done ? 'bg-emerald-500 text-white' : 'bg-ink-200 text-ink-400'
              } ${isCurrent ? 'scale-110 shadow-lg shadow-emerald-500/30' : ''}`}
            >
              <step.icon className="h-5 w-5" />
            </span>
            <span className={`mt-2 text-xs font-semibold ${done ? 'text-ink-900' : 'text-ink-400'}`}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

const ACTIONS = {
  ACCEPTED: { label: 'Accept order', className: 'btn-success' },
  READY: { label: 'Mark as ready', className: 'btn-primary' },
  PICKED_UP: { label: 'Mark as picked up', className: 'btn-primary' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', className: 'btn-primary' },
  DELIVERED: { label: 'Mark as delivered', className: 'btn-primary' },
  REJECTED: { label: 'Reject', className: 'btn-secondary text-red-600', destructive: true },
  CANCELLED: { label: 'Cancel order', className: 'btn-secondary text-red-600', destructive: true },
};

const SUCCESS_MESSAGE = {
  ACCEPTED: 'Order accepted',
  READY: 'Customer notified: order is ready',
  PICKED_UP: 'Order completed',
  OUT_FOR_DELIVERY: 'Customer notified: order is on the way',
  DELIVERED: 'Order delivered',
  REJECTED: 'Order rejected',
  CANCELLED: 'Order cancelled',
};

export function OrderActions({ order, className = '' }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const mutation = useMutation({
    mutationFn: ({ status, note }) => api(`/orders/${order.id}/status`, { method: 'PATCH', body: { status, note } }),
    onSuccess: ({ order: updated }, { status }) => {
      queryClient.setQueryData(['order', order.id], updated);
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['shop-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-stats'] });
      // Rejecting / cancelling puts tracked stock back
      if (status === 'REJECTED' || status === 'CANCELLED') {
        queryClient.invalidateQueries({ queryKey: ['seller-products'] });
        queryClient.invalidateQueries({ queryKey: ['stock-log'] });
      }
      toast.success(SUCCESS_MESSAGE[status]);
    },
    onError: (e) => toast.error(e.message),
  });

  if (!order.allowedNextStatuses.length) return null;

  async function run(status) {
    let note = null;
    if (ACTIONS[status]?.destructive) {
      const result = await confirm({
        title: status === 'REJECTED' ? `Reject order #${order.orderNo}?` : `Cancel order #${order.orderNo}?`,
        message: 'This cannot be undone.',
        confirmLabel: ACTIONS[status].label,
        cancelLabel: 'Go back',
        danger: true,
        withReason: true,
        reasonPlaceholder: status === 'REJECTED' ? 'e.g. Item not available' : 'e.g. Ordered by mistake',
      });
      if (!result.ok) return;
      note = result.reason;
    }
    mutation.mutate({ status, note });
  }

  // Primary (forward) actions first, destructive ones last
  const sorted = [...order.allowedNextStatuses].sort(
    (a, b) => Number(Boolean(ACTIONS[a]?.destructive)) - Number(Boolean(ACTIONS[b]?.destructive)),
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-2 [&>.btn]:flex-1 sm:[&>.btn]:flex-none">
        {sorted.map((s) => (
          <button key={s} className={`btn ${ACTIONS[s]?.className ?? 'btn-secondary'}`} disabled={mutation.isPending} onClick={() => run(s)}>
            {ACTIONS[s]?.label ?? s}
          </button>
        ))}
      </div>
      <ErrorMessage error={mutation.error} />
    </div>
  );
}

export function OrderItems({ order }) {
  return (
    <div className="space-y-2">
      <ul className="space-y-2 text-sm">
        {order.items.map((i) => (
          <li key={i.productId ?? i.name} className="flex items-baseline justify-between gap-3">
            <span className="text-ink-700">
              <span className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-ink-100 px-1 text-xs font-bold text-ink-700">
                {i.quantity}×
              </span>
              {i.name}
              {i.unit && <span className="text-ink-400"> · {i.unit}</span>}
            </span>
            <span className="font-medium whitespace-nowrap">{formatPaise(i.lineTotalPaise)}</span>
          </li>
        ))}
      </ul>
      {order.fulfilmentType === 'delivery' && (
        <div className="space-y-1 border-t border-dashed border-ink-200 pt-2 text-sm text-ink-600">
          <div className="flex justify-between">
            <span>Items</span>
            <span>{formatPaise(order.subtotalPaise)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery fee</span>
            <span className={order.deliveryFeePaise ? '' : 'font-bold text-emerald-700'}>{order.deliveryFeePaise ? formatPaise(order.deliveryFeePaise) : 'FREE'}</span>
          </div>
        </div>
      )}
      <div className="flex justify-between border-t border-dashed border-ink-200 pt-2 font-bold">
        <span>Total</span>
        <span>{formatPaise(order.totalPaise)}</span>
      </div>
    </div>
  );
}

export function WaitingHint({ status, fulfilmentType = 'pickup' }) {
  const text = {
    PLACED: 'Waiting for the shop to accept your order',
    ACCEPTED: fulfilmentType === 'delivery' ? 'The shop is packing your order for delivery' : 'The shop is packing your order',
    READY: 'Your order is ready! Visit the shop to pick it up',
    OUT_FOR_DELIVERY: 'Your order is on the way',
  }[status];
  if (!text) return null;
  const good = status === 'READY' || status === 'OUT_FOR_DELIVERY';
  return (
    <p className={`flex items-center gap-2 text-sm font-medium ${good ? 'text-emerald-700' : 'text-ink-500'}`}>
      <Clock className="h-4 w-4" /> {text}
    </p>
  );
}
