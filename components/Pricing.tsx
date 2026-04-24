import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: 1990,
    description: "Perfekt for små klinikker som vil komme i gang.",
    features: [
      "AI-resepsjonist på nettsiden",
      "Svar på vanlige spørsmål",
      "Åpningstider & priser",
      "E-postvarsel ved ny henvendelse",
      "Opptil 200 samtaler / mnd",
    ],
    cta: "Prøv gratis i 14 dager",
    highlight: false,
  },
  {
    name: "Pro",
    price: 3990,
    description: "For klinikker som vil automatisere resepsjonen fullt ut.",
    features: [
      "Alt i Starter",
      "Automatisk timebooking",
      "SMS-bekreftelse til pasienter",
      "Avbestilling og ombooking",
      "Ubegrenset samtaler",
      "Prioritert support",
    ],
    cta: "Prøv gratis i 14 dager",
    highlight: true,
  },
  {
    name: "Klinikkkjede",
    price: null,
    description: "Skreddersydd løsning for klinikker med flere lokasjoner.",
    features: [
      "Alt i Pro",
      "Flere lokasjoner i én løsning",
      "Integrasjon med journalsystem",
      "Dedikert onboarding",
      "SLA-garanti",
      "Faktura per kvartal",
    ],
    cta: "Ta kontakt",
    highlight: false,
  },
];

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

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.highlight
                  ? "bg-ink-900 text-white shadow-2xl ring-2 ring-brand-500"
                  : "bg-white border border-ink-100 shadow-soft"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white shadow">
                    Mest populær
                  </span>
                </div>
              )}

              <div>
                <p className={`text-sm font-semibold uppercase tracking-wider ${plan.highlight ? "text-brand-400" : "text-brand-700"}`}>
                  {plan.name}
                </p>
                <div className="mt-3 flex items-end gap-1">
                  {plan.price !== null ? (
                    <>
                      <span className={`text-4xl font-bold tracking-tight ${plan.highlight ? "text-white" : "text-ink-900"}`}>
                        {plan.price.toLocaleString("nb-NO")}
                      </span>
                      <span className={`mb-1 text-sm ${plan.highlight ? "text-white/60" : "text-ink-500"}`}>
                        kr / mnd
                      </span>
                    </>
                  ) : (
                    <span className={`text-3xl font-bold tracking-tight ${plan.highlight ? "text-white" : "text-ink-900"}`}>
                      Kontakt oss
                    </span>
                  )}
                </div>
                <p className={`mt-2 text-sm leading-relaxed ${plan.highlight ? "text-white/70" : "text-ink-500"}`}>
                  {plan.description}
                </p>
              </div>

              <ul className="mt-8 space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <svg
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${plan.highlight ? "text-brand-400" : "text-brand-600"}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className={plan.highlight ? "text-white/85" : "text-ink-700"}>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  href="#demo"
                  className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition ${
                    plan.highlight
                      ? "bg-brand-500 text-white hover:bg-brand-600"
                      : "bg-ink-900 text-white hover:bg-ink-800"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-ink-500">
          Alle priser er ekskl. mva. Trenger du hjelp til å velge?{" "}
          <a href="mailto:hei@svarai.no" className="text-brand-700 hover:underline">
            Send oss en e-post
          </a>
          .
        </p>
      </div>
    </section>
  );
}
