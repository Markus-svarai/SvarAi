"use client";

import { useState } from "react";

const links = [
  { href: "#problem", label: "Problemet" },
  { href: "#hvordan", label: "Hvordan" },
  { href: "#fordeler", label: "Fordeler" },
  { href: "#demo", label: "Demo" },
  { href: "#priser", label: "Priser" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-ink-100">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-ink-900 text-white flex items-center justify-center font-bold">
            S
          </div>
          <span className="font-semibold text-ink-900 tracking-tight">SvarAI</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink-600">
          {links.map(l => (
            <a key={l.href} href={l.href} className="hover:text-ink-900 transition">{l.label}</a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a href="#demo" className="text-sm text-ink-700 hover:text-ink-900 transition">
            Prøv demo
          </a>
          <a
            href="#kontakt"
            className="inline-flex items-center rounded-lg bg-ink-900 text-white text-sm font-medium px-4 py-2 hover:bg-ink-800 transition"
          >
            Book demo
          </a>
        </div>

        {/* Mobile: Book demo + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <a
            href="#kontakt"
            className="inline-flex items-center rounded-lg bg-ink-900 text-white text-sm font-medium px-4 py-2 hover:bg-ink-800 transition"
          >
            Book demo
          </a>
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg text-ink-600 hover:text-ink-900 hover:bg-ink-50 transition"
            aria-label="Meny"
          >
            {open ? (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-ink-100 bg-white/95 backdrop-blur-md px-6 py-4">
          <nav className="flex flex-col gap-1">
            {links.map(l => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50 hover:text-ink-900 transition"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 pt-4 border-t border-ink-100">
            <a
              href="#demo"
              onClick={() => setOpen(false)}
              className="block w-full rounded-lg border border-ink-200 py-2.5 text-center text-sm font-medium text-ink-700 hover:bg-ink-50 transition"
            >
              Prøv live-demoen
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
