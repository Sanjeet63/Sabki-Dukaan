import { ArrowLeftRight } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router';
import Logo, { LogoMark } from '../components/Logo.jsx';
import UserMenu from '../components/UserMenu.jsx';

// Shared by the seller and admin panels: dark sidebar on desktop, floating tab bar on phones
export default function PanelLayout({ subtitle, homeTo, nav, sidebarHeader, mobileTitle, mobileBadge, mobileRight, outletContext }) {
  return (
    <div className="min-h-dvh bg-cream lg:pl-72">
      <aside className="fixed inset-y-0 left-0 z-[1100] hidden w-72 flex-col bg-ink-900 text-white lg:flex">
        <div className="awning" style={{ '--awning-a': 'var(--color-brand-500)', '--awning-b': 'var(--color-marigold-300)' }} />
        <div className="px-6 pt-7 pb-5">
          <Logo to={homeTo} subtitle={subtitle} light />
        </div>
        {sidebarHeader && <div className="mx-4 mb-4 rounded-3xl bg-white/[0.06] p-4">{sidebarHeader}</div>}
        <nav className="flex-1 space-y-1 px-4">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-bold transition ${
                  isActive ? 'bg-lime-400 text-ink-900' : 'text-white/65 hover:bg-white/[0.06] hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {item.badge > 0 && (
                <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-extrabold text-white">{item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4">
          <Link to="/" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white/60 hover:bg-white/[0.06] hover:text-white">
            <ArrowLeftRight className="h-5 w-5" />
            Switch to customer app
          </Link>
        </div>
      </aside>

      {/* Phone header */}
      <header className="sticky top-0 z-[1000] bg-ink-900 text-white lg:hidden">
        <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
          <Link to={homeTo} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white">
            <LogoMark className="h-8 w-8" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold tracking-[0.16em] text-lime-400 uppercase">{subtitle}</p>
            <p className="font-display truncate text-[17px] leading-tight font-extrabold">{mobileTitle}</p>
            {mobileBadge}
          </div>
          {mobileRight}
          <UserMenu compact />
        </div>
      </header>

      {/* Desktop top bar */}
      <header className="sticky top-0 z-[1000] hidden h-16 items-center justify-end gap-3 border-b border-ink-100 bg-cream/90 px-8 backdrop-blur lg:flex">
        <UserMenu />
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-5 pb-32 lg:px-8 lg:pt-8 lg:pb-12">
        <Outlet context={outletContext} />
      </main>

      <nav className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-[1100] px-3 lg:hidden">
        <div className="pointer-events-auto mx-auto mb-3 flex max-w-md items-center gap-1 rounded-[26px] bg-ink-900/95 p-1.5 shadow-lift backdrop-blur-md">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative flex h-12 items-center justify-center gap-1.5 rounded-[20px] transition-all duration-300 active:scale-95 ${
                  isActive ? 'flex-[1.9] bg-lime-400 text-ink-900' : 'flex-1 text-white/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <item.icon className="h-[21px] w-[21px]" strokeWidth={isActive ? 2.5 : 2} />
                    {item.badge > 0 && (
                      <span className="absolute -top-2 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-ink-900">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  {isActive && <span className="animate-fade text-[13px] font-extrabold">{item.shortLabel ?? item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
