import { ExternalLink, Lightbulb, MessageCircle, QrCode, Store } from 'lucide-react';
import { Link, useOutletContext } from 'react-router';
import { CopyLinkField, PosterActions, ShareButtons, ShopPoster, useShopQr } from '../../components/ShareShop.jsx';
import { PageHeader } from '../../components/ui.jsx';
import { shopShareUrl } from '../../lib/format.js';

const TIPS = [
  { icon: MessageCircle, text: 'Post the link in your WhatsApp status and in your society or colony groups.' },
  { icon: QrCode, text: 'Stick the printed QR poster on your counter and shutter so walk-in customers can save your shop.' },
  { icon: Store, text: 'Add photos and keep stock updated. Shops with photos get many more orders.' },
];

export default function SellerSharePage() {
  const { shop } = useOutletContext();
  const url = shopShareUrl(shop);
  const qr = useShopQr(url, 800);
  const live = shop.status === 'active';

  return (
    <div>
      <PageHeader
        title="Share your shop"
        subtitle="Your own link and QR code. Anyone can open it and see your products, no login needed."
        actions={
          live && (
            <Link to={`/s/${shop.slug}`} className="btn btn-secondary">
              <ExternalLink className="h-4 w-4" /> Open my shop page
            </Link>
          )
        }
      />

      {!live && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Your link will start working once your shop is approved.</b> You can get the poster ready now.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <section className="card space-y-4 p-6">
            <div>
              <h2 className="text-lg font-bold">Your shop link</h2>
              <p className="text-sm text-ink-600">This link never changes, even if you rename your shop.</p>
            </div>
            <CopyLinkField url={url} />
            <ShareButtons shop={shop} url={url} />
          </section>

          <section className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Lightbulb className="h-5 w-5 text-marigold-500" /> Get more customers
            </h2>
            <ul className="space-y-4">
              {TIPS.map((t) => (
                <li key={t.text} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <t.icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="pt-1.5 text-sm text-ink-700">{t.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <ShopPoster shop={shop} qr={qr} url={url} />
          <PosterActions shop={shop} qr={qr} />
        </aside>
      </div>
    </div>
  );
}
