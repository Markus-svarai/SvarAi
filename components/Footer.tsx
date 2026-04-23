export default function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-ink-900 text-white flex items-center justify-center font-bold">
              S
            </div>
            <span className="font-semibold text-ink-900">SvarAI</span>
            <span className="text-xs text-ink-400 ml-2">AI-resepsjonist for klinikker</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-ink-500">
            <a href="#problem" className="hover:text-ink-900">Problemet</a>
            <a href="#hvordan" className="hover:text-ink-900">Hvordan</a>
            <a href="#demo" className="hover:text-ink-900">Demo</a>
            <a href="#kontakt" className="hover:text-ink-900">Kontakt</a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-ink-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-ink-400">
          <p>© {new Date().getFullYear()} SvarAI. Alle rettigheter forbeholdt.</p>
          <p>Laget i Norge 🇳🇴 for norske klinikker.</p>
        </div>
      </div>
    </footer>
  );
}
