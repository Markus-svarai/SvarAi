export default function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-ink-100">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-ink-900 text-white flex items-center justify-center font-bold">
            S
          </div>
          <span className="font-semibold text-ink-900 tracking-tight">SvarAI</span>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm text-ink-600">
          <a href="#problem" className="hover:text-ink-900 transition">Problemet</a>
          <a href="#hvordan" className="hover:text-ink-900 transition">Hvordan</a>
          <a href="#fordeler" className="hover:text-ink-900 transition">Fordeler</a>
          <a href="#demo" className="hover:text-ink-900 transition">Demo</a>
          <a href="#priser" className="hover:text-ink-900 transition">Priser</a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#demo"
            className="hidden sm:inline-flex items-center text-sm text-ink-700 hover:text-ink-900 transition"
          >
            Prøv demo
          </a>
          <a
            href="#kontakt"
            className="inline-flex items-center rounded-lg bg-ink-900 text-white text-sm font-medium px-4 py-2 hover:bg-ink-800 transition"
          >
            Book demo
          </a>
        </div>
      </div>
    </header>
  );
}
