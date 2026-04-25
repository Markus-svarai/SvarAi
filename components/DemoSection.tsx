import ChatDemo from "./ChatDemo";
import { clinicConfig } from "@/lib/clinic-config";

export default function DemoSection() {
  return (
    <section id="demo" className="py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-brand-700 uppercase tracking-wider">Live demo</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900 leading-tight">
            Prøv SvarAI akkurat som pasientene dine ville gjort.
          </h2>
          <p className="mt-5 text-lg text-ink-600 leading-relaxed">
            Beskriv symptomene dine, spør om priser og åpningstider, eller bestill time direkte.
            SvarAI forstår hva du trenger og hjelper deg til riktig behandling – akkurat som en resepsjonist, men aldri opptatt.
          </p>
        </div>

        <div className="mt-12">
          <ChatDemo />
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-ink-600">
          {[
            { q: "Jeg har vondt i en tann bak, det stikker og banker", hint: "Symptomforståelse" },
            { q: "Tannen min er veldig følsom for kaldt", hint: "Diagnose & råd" },
            { q: "Jeg vil bestille tannrens", hint: "Booking-flyt" },
            { q: "Når har dere åpent?", hint: "Åpningstider" },
          ].map(x => (
            <div key={x.q} className="rounded-xl border border-ink-100 bg-white p-4">
              <p className="text-xs font-medium text-brand-700 uppercase tracking-wider">{x.hint}</p>
              <p className="mt-2 text-sm text-ink-800">&quot;{x.q}&quot;</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
