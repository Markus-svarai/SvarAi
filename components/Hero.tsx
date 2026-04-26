import AnimatedDemo from "./AnimatedDemo";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 hero-glow pointer-events-none" />
      <div className="absolute inset-0 bg-dot-grid opacity-60 pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left – text */}
          <div className="flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/70 backdrop-blur px-3 py-1 text-xs text-ink-600 shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse-soft" />
              Bygget for klinikker i Norge
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl font-semibold tracking-tight text-gradient leading-[1.05]">
              Slutt å miste pasienter fordi telefonen ringer{" "}
              <span className="text-gradient-brand">opptatt.</span>
            </h1>

            <p className="mt-6 text-lg text-ink-600 leading-relaxed">
              SvarAI er en AI-resepsjonist som svarer på alle henvendelser,
              booker timer og forbedrer kundeservicen din — døgnet rundt, på norsk.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-start gap-3">
              <a
                href="https://buy.stripe.com/7sY3cx5DUalR5S41jf3gk01"
                className="inline-flex items-center justify-center rounded-xl bg-ink-900 text-white font-medium px-6 py-3 hover:bg-ink-800 transition shadow-soft"
              >
                Kom i gang
                <svg className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 10a1 1 0 011-1h10.586l-3.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 11H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </a>
              <a
                href="#demo"
                className="inline-flex items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-900 font-medium px-6 py-3 hover:border-ink-300 transition"
              >
                Prøv live-demoen
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-ink-500">
              <span className="flex items-center gap-2"><Check /> Svarer på sekunder, 24/7</span>
              <span className="flex items-center gap-2"><Check /> Booker time uten menneskelig hjelp</span>
              <span className="flex items-center gap-2"><Check /> Pengene tilbake hvis du ikke er fornøyd</span>
            </div>
          </div>

          {/* Right – animated demo */}
          <div className="hidden lg:block">
            <AnimatedDemo />
          </div>

        </div>
      </div>
    </section>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-brand-500">
      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd" />
    </svg>
  );
}
