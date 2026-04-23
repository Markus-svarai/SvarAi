const features = [
  {
    title: "Svarer alltid, på sekunder",
    description:
      "SvarAI tar imot chat-, telefon- og nettsidehenvendelser samtidig. Ingen kø, ingen telefonsvarer. På norsk, døgnet rundt.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-6 4h4m5 4l-3-3H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-1" />
      </svg>
    ),
  },
  {
    title: "Booker timer selv",
    description:
      "Guider pasienten gjennom tjeneste, dato og tid – henter ledige tider fra kalenderen og bekrefter direkte.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Kan alt om din klinikk",
    description:
      "Åpningstider, priser, tjenester, adresser, avbestillingsregler. Vi trener SvarAI på dine rutiner.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v7m0 0l-7-3.5M12 21l7-3.5" />
      </svg>
    ),
  },
  {
    title: "Setter over når det trengs",
    description:
      "Komplekse spørsmål sendes direkte til riktig ansatt med full kontekst – ingen \"kan du gjenta det?\".",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.63a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    title: "Aldri syk, aldri travel",
    description:
      "Håndterer 100+ samtidige henvendelser. Ferier, helger og kveldstimer blir ikke lenger tapte inntekter.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "GDPR-vennlig, norsk data",
    description:
      "Data lagres i EU. Full sporbarhet, full kontroll, ingen svarte bokser. Designet for norsk helsesektor.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.657 1.343-3 3-3s3 1.343 3 3v2M8 11V9a4 4 0 118 0m-9 2h10a1 1 0 011 1v7a2 2 0 01-2 2H8a2 2 0 01-2-2v-7a1 1 0 011-1z" />
      </svg>
    ),
  },
];

export default function Features() {
  return (
    <section className="py-24 bg-ink-50/50 border-y border-ink-100">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-brand-700 uppercase tracking-wider">Hva SvarAI gjør</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900 leading-tight">
            En resepsjonist som aldri sover — og aldri sier nei.
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(f => (
            <div
              key={f.title}
              className="rounded-2xl border border-ink-100 bg-white p-6 hover:shadow-card transition"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 border border-brand-100">
                {f.icon}
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-600 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
