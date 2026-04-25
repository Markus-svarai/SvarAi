import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: 1990,
    badge: "14 dager gratis",
    description: "Alt du trenger for å aldri gå glipp av en pasienthenvendelse igjen.",
    features: [
      "AI-resepsjonist på nettsiden din",
      "Svarer på spørsmål om priser, åpningstider og tjenester",
      "Enkel booking-flyt for pasienter",
      "Du får e-post ved nye henvendelser",
      "Oppsett på under én uke",
      "Ingen bindingstid – avslutt når du vil",
    ],
    cta: "Prøv gratis i 14 dager",
    ctaHref: "#kontakt",
    highlight: true,
    comingSoon: false,
  },
  {
    name: "Pro",
    price: 3990,
    badge: "Kommer snart",
    description: "For klinikker som vil automatisere resepsjonen fullt ut.",
    features: [
      "Alt i Starter",
      "Automatisk timebooking",
      "SMS-bekreftelse til pasienter",
      "Avbestilling og ombooking",
      "Ubegrenset samtaler",
      "Prioritert support",
    ],
    cta: "Skriv deg opp",
    ctaHref: "#kontakt",
    highlight: false,
    comingSoon: true,
  },
  {
    name: "Telefon",
    price: null,
    badge: "Kommer snart",
    description: "En AI som faktisk tar telefonen – gjenkjenner nummeret og husker pasienten.",
    features: [
      "Alt i Pro",
      "AI svarer på innkommende anrop",
      "Gjenkjenner faste pasienter",
      "Husker tidligere besøk og ønsker",
      "Sender beskrivelse til ansatte før timen",
      "Tilgjengelig døgnet rundt",
    ],
    cta: "Skriv deg opp",
    ctaHref: "#kontakt",
    highlight: false,
    comingSoon: true,
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
              } ${plan.comingSoon ? "opacity-75" : ""}`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white shadow ${plan.comingSoon ? "bg-ink-400" : "bg-brand-500"}`}>
                  {plan.badge}
                </span>
              </div>

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

              <ul className="mt-8 space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <svg
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${plan.highlight ? "text-brand-400" : "text-brand-600"}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd" />
                    </svg>
                    <span className={plan.highlight ? "text-white/85" : "text-ink-700"}>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  href={plan.ctaHref}
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

        <div className="mt-10 flex items-start gap-3 max-w-md rounded-xl border border-brand-100 bg-brand-50/50 p-4">
          <svg className="h-5 w-5 text-brand-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-ink-900">Ikke fornøyd? Pengene tilbake.</p>
            <p className="text-sm text-ink-500 mt-0.5">Hvis du ikke er fornøyd etter første måned refunderer vi hele beløpet – ingen spørsmål stilt.</p>
          </div>
        </div>

        <p className="mt-6 text-sm text-ink-500">
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
