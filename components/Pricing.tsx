import Link from "next/link";

export default function Pricing() {
  return (
    <section id="priser" className="py-24 bg-ink-50/40">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-brand-700 uppercase tracking-wider">Priser</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900 leading-tight">
            Enkelt og forutsigbart – ingen bindingstid.
          </h2>
          <p className="mt-5 text-lg text-ink-600 leading-relaxed">
            Start gratis i 14 dager. Ingen kredittkort nødvendig. Avslutter du innen prøveperioden betaler du ingenting.
          </p>
        </div>

        <div className="mt-12 max-w-md">
          <div className="relative rounded-2xl p-8 flex flex-col bg-ink-900 text-white shadow-2xl ring-2 ring-brand-500">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white shadow">
                14 dager gratis
              </span>
            </div>

            <p className="text-sm font-semibold uppercase tracking-wider text-brand-400">
              SvarAI
            </p>

            <div className="mt-3 flex items-end gap-1">
              <span className="text-4xl font-bold tracking-tight text-white">1 990</span>
              <span className="mb-1 text-sm text-white/60">kr / mnd</span>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Alt du trenger for å aldri gå glipp av en pasienthenvendelse igjen.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "AI-resepsjonist på nettsiden din",
                "Svarer på spørsmål om priser, åpningstider og tjenester",
                "Enkel booking-flyt for pasienter",
                "Du får e-post ved nye henvendelser",
                "Oppsett på under én uke",
                "Ingen bindingstid – avslutt når du vil",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white/85">{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Link
                href="#kontakt"
                className="block w-full rounded-xl py-3 text-center text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600 transition"
              >
                Prøv gratis i 14 dager
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-8 text-sm text-ink-500">
          Alle priser er ekskl. mva. Spørsmål?{" "}
          <a href="mailto:Markus08aasheim@gmail.com" className="text-brand-700 hover:underline">
            Ta kontakt med oss
          </a>
          .
        </p>
      </div>
    </section>
  );
}
