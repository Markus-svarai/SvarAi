"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const steps = [
  {
    number: "1",
    title: "Abonnementet er aktivert",
    description: "Din klinikk er registrert og admin-panelet er klart til bruk.",
    time: "Nå",
    done: true,
  },
  {
    number: "2",
    title: "Logg inn og tilpass klinikken",
    description: "Sett opp tjenester, priser, åpningstider og ansatte direkte i admin-panelet.",
    time: "5 minutter",
    done: false,
  },
  {
    number: "3",
    title: "Kopier innbyggingskoden",
    description: "Du finner én kodelinje under Innstillinger i admin. Lim den inn på nettsiden din.",
    time: "2 minutter",
    done: false,
  },
  {
    number: "4",
    title: "AI-resepsjonisten er live",
    description: "Pasienter kan booke time direkte via widgeten — uten at du trenger å svare.",
    time: "Dag 1",
    done: false,
  },
];

function TakkContent() {
  const params = useSearchParams();
  const clinicId = params.get("clinicId");
  const adminUrl = clinicId
    ? `/admin?clinicId=${encodeURIComponent(clinicId)}`
    : "/admin";

  return (
    <main>
      <Nav />
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 hero-glow pointer-events-none" />
        <div className="relative mx-auto max-w-2xl px-6 text-center">

          {/* Checkmark */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-500/10 ring-8 ring-brand-500/10">
            <svg className="h-10 w-10 text-brand-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd" />
            </svg>
          </div>

          <h1 className="mt-6 text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900">
            Betaling mottatt!
          </h1>
          <p className="mt-4 text-lg text-ink-600 leading-relaxed">
            Velkommen til SvarAI. Klinikken din er klar — du kan sette opp alt selv i admin-panelet med en gang.
          </p>

          {/* Primærknapp → admin */}
          <a
            href={adminUrl}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-sm font-semibold text-white hover:bg-brand-600 transition shadow-md"
          >
            Gå til admin-panelet
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </a>

          {/* Steps */}
          <div className="mt-14 text-left space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-ink-500 mb-6">Hva skjer nå</p>
            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex gap-5 rounded-2xl border p-5 ${
                  step.done
                    ? "border-brand-200 bg-brand-50/60"
                    : "border-ink-100 bg-white shadow-soft"
                }`}
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold text-sm ${
                  step.done ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-600"
                }`}>
                  {step.done ? (
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd" />
                    </svg>
                  ) : step.number}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-semibold ${step.done ? "text-brand-700" : "text-ink-900"}`}>
                      {step.title}
                    </p>
                    <span className={`text-xs whitespace-nowrap ${step.done ? "text-brand-500 font-medium" : "text-ink-400"}`}>
                      {step.time}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-600 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Kontakt */}
          <div className="mt-10 rounded-2xl border border-ink-100 bg-ink-50/50 p-6 text-left">
            <p className="font-semibold text-ink-900">Trenger du hjelp?</p>
            <p className="mt-1 text-sm text-ink-600">
              Vi hjelper deg med oppsett om du trenger det. Send oss en e-post, så svarer vi raskt.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:hei@svarai.no"
                className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-900 hover:border-ink-300 transition"
              >
                <svg className="h-4 w-4 text-brand-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                hei@svarai.no
              </a>
              <a
                href="tel:+4792167470"
                className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-900 hover:border-ink-300 transition"
              >
                <svg className="h-4 w-4 text-brand-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                +47 921 67 470
              </a>
            </div>
          </div>

          <a
            href="/"
            className="mt-8 inline-flex items-center text-sm text-ink-500 hover:text-ink-700 transition"
          >
            ← Tilbake til svarai.no
          </a>

        </div>
      </section>
      <Footer />
    </main>
  );
}

export default function TakkPage() {
  return (
    <Suspense>
      <TakkContent />
    </Suspense>
  );
}
