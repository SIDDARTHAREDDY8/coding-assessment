'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useActingAs } from '@/context/acting-as-context';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Documents' },
  { href: '/audit', label: 'Audit log' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { users, activeUserId, setActiveUserId, activeUser } = useActingAs();

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200/90 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href="/"
            className="shrink-0 text-xl font-semibold tracking-tight text-stone-900"
          >
            Narratize
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname === link.href ||
                    pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn('nav-link', isActive && 'nav-link-active')}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <label className="flex shrink-0 items-center gap-2.5 rounded-lg border border-stone-200 bg-stone-50/70 py-1.5 pl-3 pr-1.5 text-sm text-stone-500">
          <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
            Acting as
          </span>
          <select
            value={activeUserId}
            onChange={(event) => setActiveUserId(event.target.value)}
            aria-label="Acting as user"
            className="min-w-[10rem] rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm font-medium text-stone-900 shadow-sm outline-none transition hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-900/10"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          {activeUser?.jobTitle && (
            <span className="hidden whitespace-nowrap pr-1.5 text-xs text-stone-400 lg:inline">
              {activeUser.jobTitle}
            </span>
          )}
        </label>
      </div>
    </header>
  );
}
