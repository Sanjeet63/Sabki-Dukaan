import { Bell, Check, Info, TriangleAlert, X } from 'lucide-react';
import { Toaster } from 'sonner';

// Coloured icon tile shown on the left of every toast
export function ToastIcon({ icon: Icon, className }) {
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${className}`}>
      <Icon className="h-[18px] w-[18px]" strokeWidth={2.75} />
    </span>
  );
}

export const newOrderIcon = <ToastIcon icon={Bell} className="animate-pulse bg-brand-500 text-white" />;

const ICONS = {
  success: <ToastIcon icon={Check} className="bg-lime-400 text-ink-900" />,
  error: <ToastIcon icon={X} className="bg-red-500 text-white" />,
  info: <ToastIcon icon={Info} className="bg-sky-400 text-ink-900" />,
  warning: <ToastIcon icon={TriangleAlert} className="bg-marigold-400 text-ink-900" />,
};

// Dark seller-panel style toasts. On phones they sit just under the dark header.
export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      offset={{ top: 80 }}
      mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 76px)', left: 12, right: 12 }}
      gap={10}
      icons={ICONS}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'pointer-events-auto flex w-full items-center gap-3 rounded-[22px] bg-ink-900 py-3 pr-4 pl-3 text-white shadow-[0_18px_40px_-12px_rgb(0_0_0/0.5)] ring-1 ring-white/10',
          icon: 'shrink-0',
          content: 'min-w-0 flex-1',
          title: 'text-[14px] leading-snug font-extrabold',
          description: 'mt-0.5 text-[12.5px] leading-snug font-medium text-white/65',
          actionButton: 'shrink-0 rounded-xl bg-lime-400 px-3 py-2 text-xs font-extrabold text-ink-900',
          cancelButton: 'shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs font-extrabold text-white',
        },
      }}
    />
  );
}
