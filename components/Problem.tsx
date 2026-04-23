const stats = [
  {
    figure: "38%",
    label: "av alle klinikk-oppringninger",
    sub: "blir aldri besvart i arbeidstiden.",
  },
  {
    figure: "67%",
    label: "av pasienter",
    sub: "ringer ikke tilbake hvis de møtes av telefonsvarer.",
  },
  {
    figure: "14 min",
    label: "gjennomsnittlig ventetid",
    sub: "i telefonkø hos travle klinikker.",
  },
];

export default function Problem() {
  return (
    <section id="problem" className="relative py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-brand-700 uppercase tracking-wider">Problemet</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900 leading-tight">
            Klinikken din mister pasienter hver dag <br className="hidden sm:block" />
            — og du vet det ikke engang.
          </h2>
          <p className="mt-5 text-lg text-ink-600 leading-relaxed">
            Resepsjonister er fantastiske, men de kan ikke være i tre samtaler samtidig.
            Mens de svarer én pasient, legger tre andre på. Kveldstimer, helger og pauser
            er et sort hull. Hver ubesvart henvendelse er en pasient som bestiller hos konkurrenten.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map(s => (
            <div
              key={s.figure}
              className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft"
            >
              <div className="text-4xl font-semibold text-ink-900 tracking-tight">{s.figure}</div>
              <div className="mt-2 text-sm font-medium text-ink-900">{s.label}</div>
              <div className="mt-1 text-sm text-ink-500">{s.sub}</div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-ink-400">
          * Indikative bransjetall. Tallene varierer mellom klinikker og tjenesteområder.
        </p>
      </div>
    </section>
  );
}
