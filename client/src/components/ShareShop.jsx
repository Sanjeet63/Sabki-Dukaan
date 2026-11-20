import { Check, Copy, Download, MessageCircle, Printer, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { shopShareUrl } from '../lib/format.js';
import { Modal } from './Dialog.jsx';
import { LogoMark, Wordmark } from './Logo.jsx';

export function useShopQr(url, width = 640) {
  const [dataUrl, setDataUrl] = useState(null);
  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1f1a15', light: '#ffffff' } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [url, width]);
  return dataUrl;
}

export const whatsappShareText = (shop, url) =>
  `🛍️ ${shop.name} is now on SabkiDukaan!\nSee our products and prices, and order ahead for pickup:\n${url}`;

export function CopyLinkField({ url }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Please select and copy the link.');
    }
  }
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-ink-50 p-1.5 pl-4">
      <span className="min-w-0 flex-1 truncate font-mono text-sm text-ink-800" title={url}>
        {url.replace(/^https?:\/\//, '')}
      </span>
      <button type="button" className="btn btn-dark btn-sm" onClick={copy}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function ShareButtons({ shop, url, size = '' }) {
  async function nativeShare() {
    try {
      await navigator.share({ title: shop.name, text: `${shop.name} on SabkiDukaan`, url });
    } catch {
      /* cancelled */
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <a
        className={`btn btn-whatsapp ${size}`}
        target="_blank"
        rel="noreferrer"
        href={`https://wa.me/?text=${encodeURIComponent(whatsappShareText(shop, url))}`}
      >
        <MessageCircle className="h-4 w-4" /> Share on WhatsApp
      </a>
      {typeof navigator !== 'undefined' && navigator.share && (
        <button type="button" className={`btn btn-secondary ${size}`} onClick={nativeShare}>
          <Share2 className="h-4 w-4" /> More options
        </button>
      )}
    </div>
  );
}

// Printable counter poster with the shop's QR code
export function ShopPoster({ shop, qr, url }) {
  return (
    <div id="print-area" className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-ink-200 bg-white text-center shadow-lift">
      <div className="awning" style={{ '--awning-a': 'var(--color-brand-500)', '--awning-b': 'var(--color-marigold-300)', '--stripe': '1.5rem', height: '2.25rem' }} />
      <div className="px-8 pt-10 pb-8">
        <p className="eyebrow">Order online from</p>
        <h2 className="mt-2 text-3xl leading-tight font-extrabold text-ink-900">{shop.name}</h2>
        <p className="mt-1 text-sm text-ink-600">
          {shop.category.icon} {shop.category.name}
          {shop.area ? ` · ${shop.area}` : ''}
        </p>
        <div className="mx-auto mt-6 w-56 rounded-3xl border-4 border-ink-900 bg-white p-3">
          {qr ? <img src={qr} alt={`QR code for ${shop.name}`} className="h-full w-full" /> : <div className="aspect-square animate-pulse rounded-xl bg-ink-100" />}
        </div>
        <p className="mt-5 text-lg font-extrabold text-ink-900">Scan to see our products & prices</p>
        <p className="mt-1 text-sm text-ink-600">Order ahead, pick up without waiting</p>
        <p className="mt-4 font-mono text-xs break-all text-ink-500">{url.replace(/^https?:\/\//, '')}</p>
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-dashed border-ink-200 bg-cream py-3">
        <LogoMark className="h-6 w-6" />
        <Wordmark className="text-base" />
      </div>
    </div>
  );
}

export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function PosterActions({ shop, qr }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button type="button" className="btn btn-secondary" disabled={!qr} onClick={() => downloadDataUrl(qr, `${shop.slug}-qr.png`)}>
        <Download className="h-4 w-4" /> Download QR
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Print poster
      </button>
    </div>
  );
}

// Share sheet for customers on a shop page
export function ShareShopModal({ shop, open, onClose }) {
  const url = shopShareUrl(shop);
  const qr = useShopQr(open ? url : null, 480);
  return (
    <Modal open={open} onClose={onClose} title={`Share ${shop.name}`} description="Send this shop to friends and family" size="max-w-md">
      <div className="space-y-5">
        <div className="mx-auto w-44 rounded-2xl border border-ink-200 p-2">
          {qr ? <img src={qr} alt="" className="w-full" /> : <div className="aspect-square animate-pulse rounded-xl bg-ink-100" />}
        </div>
        <CopyLinkField url={url} />
        <ShareButtons shop={shop} url={url} size="flex-1" />
      </div>
    </Modal>
  );
}
