const steps = [
  {
    n: "01",
    title: "Vi kartlegger klinikken din",
    body: "På 30 minutter samler vi inn åpningstider, tjenester, priser, rutiner og FAQ. Ingen teknisk jobb for deg.",
  },
  {
    n: "02",
    title: "Vi trener din egen SvarAI",
    body: "Vi bygger en AI-resepsjonist som snakker i din tone og følger dine rutiner – unik for klinikken din.",
  },
  {
    n: "03",
    title: "Live i løpet av 5 dager",
    body: "SvarAI legges på nettsiden, telefonen og chat-kanalene dine. Dere svarer på alt, 24/7.",
  },
  {
    n: "04",
    title: "Vi forbedrer kontinuerlig",
    body: "Du får ukentlige rapporter og vi finjusterer AI-en basert på ekte samtaler. Den blir smartere hver uke.",
  },
];

export default function HowItWorks() {
  return (
    <section id="hvordan" className="py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-brand-700 uppercase tracking-wider">Hvordan det fungerer</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900 leading-tight">
            Fra kick-off til live på mindre enn en uke.
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-5">
          {steps.map(s => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-ink-100 bg-white p-6 hover:shadow-card transition"
            >
              <div className="text-xs font-semibold tracking-widest text-brand-700">{s.n}</div>
              <h3 className="mt-2 text-lg font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
