'use client';

/**
 * The only interactive chrome on the page, and therefore the only 'use client'
 * boundary in the header/footer/section set — First Load JS for `/` is a tracked
 * budget (under 120 KB gzipped), and every new boundary spends from it.
 *
 * The prototype toggled the mobile menu with a CSS checkbox hack. That works without
 * JS but cannot close itself when a link is followed, and announces nothing to a
 * screen reader, so it becomes a real button with aria-expanded here.
 *
 * The `menu:` variant is the custom ~864px breakpoint from globals.css — six items
 * plus a CTA do not fit beside the brand any earlier.
 *
 * React Compiler is on — no hand-written useCallback/useMemo.
 */

import { useEffect, useRef, useState } from 'react';
import {
  activeSectionFromHash,
  pickActiveSection,
  sectionIdsFromNav,
  type NavItem,
} from '@/lib/navigation';

interface SiteHeaderProps {
  navItems: NavItem[];
  brand: string;
}

/**
 * Quiet time that counts as "the scroll is over". Smooth scrolling fires a scroll
 * event every frame, so this is comfortably longer than a frame and shorter than a
 * reader would notice — and it is what releases a jump that never lands, whether
 * because the reader interrupted it or because the page could not move at all.
 */
const SCROLL_SETTLE_MS = 120;

export function SiteHeader({ navItems, brand }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // A click on Projects starts a smooth scroll that passes About, Skills and
  // Experience on the way. Without this, the highlight repaints three times before
  // it settles. Non-null means "we are on our way to `target`" — scroll positions
  // in between are ignored until we get there, or until scrolling stops.
  const jump = useRef<{ target: string | null } | null>(null);

  // Escape closes the menu — expected of anything that opens over the page.
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  // Which link is active. Clicks need no handler of their own: following a nav
  // anchor changes the hash, and `hashchange` covers the CTA buttons and the
  // back button in the same stroke.
  useEffect(() => {
    const ids = sectionIdsFromNav(navItems);
    let frame = 0;
    let settle = 0;

    // The line the browser lands hash targets on, read from the CSS rather than
    // recomputed, so the highlight flips exactly when a clicked section comes to
    // rest under the sticky header.
    const readingLine = () => {
      const padding = parseFloat(
        getComputedStyle(document.documentElement).scrollPaddingTop,
      );
      return Number.isFinite(padding) ? padding : 0;
    };

    const sync = () => {
      const line = readingLine();
      const positions = ids.flatMap((id) => {
        const element = document.getElementById(id);
        return element
          ? [{ id, top: element.getBoundingClientRect().top - line }]
          : [];
      });
      const next = pickActiveSection(positions, {
        atBottom:
          Math.ceil(window.scrollY + window.innerHeight) >=
          document.documentElement.scrollHeight - 1,
      });

      // Still travelling: everything the scroll passes on the way is scenery.
      if (jump.current && jump.current.target !== next) return;
      jump.current = null;

      setActiveId(next);
    };

    // Arms the release. A jump that lands is released by `sync` the moment it
    // arrives; this is what releases one that never lands — the reader wheeled
    // away mid-flight, or the page had no room left to scroll.
    const awaitSettle = () => {
      clearTimeout(settle);
      settle = window.setTimeout(() => {
        jump.current = null;
        sync();
      }, SCROLL_SETTLE_MS);
    };

    const jumpTo = (target: string | null) => {
      jump.current = { target };
      setActiveId(target);
      awaitSettle();
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
      awaitSettle();
    };
    const onHashChange = () =>
      jumpTo(activeSectionFromHash(window.location.hash, ids));

    // A pasted /#projects is already scrolled into place by the time this runs —
    // but the restore can also still be pending, so seed from the hash and let the
    // first scroll confirm it rather than measuring a page that has not moved yet.
    const landed = activeSectionFromHash(window.location.hash, ids);
    if (landed) jumpTo(landed);
    else sync();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('hashchange', onHashChange);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [navItems]);

  return (
    <header className="sticky top-0 z-50 h-[var(--header-height)] border-b border-line-soft bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-[var(--header-height)] w-full max-w-page items-center justify-between gap-4 px-5">
        <a
          href="#top"
          className="text-base font-bold lowercase tracking-tight text-text hover:no-underline"
          onClick={() => setMenuOpen(false)}
        >
          {brand}
          <span className="text-accent">.</span>
        </a>

        <button
          type="button"
          className="rounded-lg border border-line p-2 menu:hidden"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" className="block h-0.5 w-5 rounded bg-text" />
          <span
            aria-hidden="true"
            className="mt-1 block h-0.5 w-5 rounded bg-text"
          />
          <span
            aria-hidden="true"
            className="mt-1 block h-0.5 w-5 rounded bg-text"
          />
        </button>

        <nav
          id="primary-navigation"
          aria-label="Primary"
          className={`${
            menuOpen ? 'block' : 'hidden'
          } fixed inset-x-0 top-[var(--header-height)] border-b border-line bg-bg-alt px-5 pt-3 pb-5 menu:static menu:block menu:border-0 menu:bg-transparent menu:p-0`}
        >
          <ul className="flex flex-col gap-0.5 menu:flex-row menu:gap-1">
            {navItems.map((item) => {
              const isActive = activeId !== null && item.href === `#${activeId}`;

              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    aria-current={isActive ? 'true' : undefined}
                    className={`relative block rounded-lg p-3 text-base font-medium hover:bg-surface hover:text-text hover:no-underline menu:px-3 menu:py-2 menu:text-sm ${
                      isActive ? 'bg-surface text-text' : 'text-dim'
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                    {/* Colour alone would not carry this (§9.2) — the bar is the
                        cue that survives a monochrome or low-vision reading. It
                        runs down the left edge in the stacked menu and under the
                        label in the desktop row. */}
                    {isActive ? (
                      <span
                        aria-hidden="true"
                        className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded bg-accent menu:top-auto menu:right-3 menu:bottom-0.5 menu:left-3 menu:h-0.5 menu:w-auto"
                      />
                    ) : null}
                  </a>
                </li>
              );
            })}
            <li className="menu:hidden">
              <a
                href="#contact"
                className="mt-2 block rounded-lg bg-accent px-3.5 py-2 text-center font-semibold text-accent-ink hover:bg-accent-bright hover:no-underline"
                onClick={() => setMenuOpen(false)}
              >
                Get My Resume
              </a>
            </li>
          </ul>
        </nav>

        <a
          href="#contact"
          className="hidden rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-bright hover:no-underline menu:inline-block"
        >
          Get My Resume
        </a>
      </div>
    </header>
  );
}
