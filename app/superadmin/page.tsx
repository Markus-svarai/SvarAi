"use client";

import { useEffect, useState } from "react";

type Clinic = {
  id: string;
  name: string;
  type: string;
  contact_email: string;
  subscription_status: string;
  booking_count: number;
  last_activity: string | null;
  created_at: string;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

function fmtRelative(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "I dag";
  if (days === 1) return "I går";
  if (days < 7) return `${days} dager siden`;
  if (days < 30) return `${Math.floor(days / 7)} uker siden`;
  return fmtDate(iso);
}

function statusCfg(s: string) {
  return {
    active:    { label: "Aktiv",          color: "bg-green-50 text-green-700 border-green-100" },
    past_due:  { label: "Betaling feilet", color: "bg-red-50 text-red-700 border-red-100" },
    cancelled: { label: "Avsluttet",       color: "bg-ink-100 text-ink-500 border-ink-200" },
    inactive:  { label: "Ikke aktivert",   color: "bg-amber-50 text-amber-700 border-amber-100" },
  }[s] ?? { label: s, color: "bg-ink-100 text-ink-500 border-ink-200" };
}

// ── Login ──────────────────────────────────────────────────────────────────

function SuperLogin({ onAuth }: { onAuth: (token: string) => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/superadmin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onAuth(pw);
      } else {
        setError(data.error ?? "Feil passord.");
        setPw("");
      }
    } catch {
      setError("Kunne ikke koble til serveren.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-10 w-10 rounded-xl bg-white text-ink-900 flex items-center justify-center font-bold text-sm">S</div>
          <div>
            <div className="font-semibold text-white text-sm">SvarAI</div>
            <div className="text-xs text-ink-400">Super Admin</div>
          </div>
        </div>
        <div className="bg-ink-900 rounded-2xl border border-ink-800 p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-400 mb-1.5">Admin-passord</label>
              <input
                type="password"
                value={pw}
                onChange={e => { setPw(e.target.value); setError(""); }}
                className="w-full rounded-lg bg-ink-800 border border-ink-700 px-3 py-2.5 text-sm text-white placeholder-ink-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                placeholder="••••••••"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-red-400 bg-red-900/30 rounded-lg px-3 py-2 border border-red-800">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white text-ink-900 text-sm font-semibold py-2.5 hover:bg-ink-100 transition disabled:opacity-60"
            >
              {loading ? "Logger inn…" : "Logg inn"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Klinikk-kort ───────────────────────────────────────────────────────────

function ClinicRow({ clinic, onOpen }: { clinic: Clinic; onOpen: () => void }) {
  const cfg = statusCfg(clinic.subscription_status);

  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900 p-5 flex items-center gap-4">
      {/* Avatar */}
      <div className="h-10 w-10 rounded-xl bg-ink-800 text-ink-300 flex items-center justify-center font-bold text-sm shrink-0 uppercase">
        {clinic.name?.[0] ?? "?"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white text-sm truncate">{clinic.name || clinic.id}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-ink-500">{clinic.id}</span>
          {clinic.contact_email && (
            <span className="text-xs text-ink-500">{clinic.contact_email}</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-6 shrink-0 text-center">
        <div>
          <div className="text-lg font-bold text-white">{clinic.booking_count}</div>
          <div className="text-xs text-ink-500">bookinger</div>
        </div>
        <div>
          <div className="text-sm font-medium text-ink-300">{fmtRelative(clinic.last_activity)}</div>
          <div className="text-xs text-ink-500">siste aktivitet</div>
        </div>
        <div>
          <div className="text-sm font-medium text-ink-300">{fmtDate(clinic.created_at)}</div>
          <div className="text-xs text-ink-500">registrert</div>
        </div>
      </div>

      {/* Åpne */}
      <button
        onClick={onOpen}
        className="shrink-0 rounded-lg bg-white text-ink-900 text-xs font-semibold px-3 py-2 hover:bg-ink-100 transition"
      >
        Åpne admin →
      </button>
    </div>
  );
}

// ── Hoved-dashboard ────────────────────────────────────────────────────────

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [openingClinic, setOpeningClinic] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/superadmin/clinics?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => setClinics(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function openClinic(clinicId: string) {
    setOpeningClinic(clinicId);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, superBypass: token }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        // Åpne klinikkens admin i ny fane
        window.open(`/admin?clinicId=${encodeURIComponent(clinicId)}&supertoken=${encodeURIComponent(token)}`, "_blank");
      } else {
        alert(data.error ?? "Kunne ikke åpne klinikk.");
      }
    } catch {
      alert("Noe gikk galt.");
    } finally {
      setOpeningClinic(null);
    }
  }

  const filtered = clinics.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.id?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_email?.toLowerCase().includes(search.toLowerCase())
  );

  const active = clinics.filter(c => c.subscription_status === "active").length;
  const inactive = clinics.filter(c => c.subscription_status === "inactive").length;
  const totalBookings = clinics.reduce((s, c) => s + c.booking_count, 0);

  return (
    <div className="min-h-screen bg-ink-950">
      {/* Header */}
      <header className="border-b border-ink-800 bg-ink-900">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-white text-ink-900 flex items-center justify-center font-bold text-xs">S</div>
            <span className="font-semibold text-white text-sm">SvarAI</span>
            <span className="text-ink-600 text-sm">·</span>
            <span className="text-xs text-ink-400 font-medium uppercase tracking-wider">Super Admin</span>
          </div>
          <button onClick={onLogout} className="text-xs text-ink-500 hover:text-white transition">
            Logg ut
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        {/* KPI */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-ink-800 bg-ink-900 p-5 text-center">
            <div className="text-3xl font-bold text-white">{clinics.length}</div>
            <div className="text-xs text-ink-400 mt-1">Klinikker totalt</div>
          </div>
          <div className="rounded-xl border border-green-900 bg-green-950 p-5 text-center">
            <div className="text-3xl font-bold text-green-400">{active}</div>
            <div className="text-xs text-green-600 mt-1">Aktive abonnement</div>
          </div>
          <div className="rounded-xl border border-ink-800 bg-ink-900 p-5 text-center">
            <div className="text-3xl font-bold text-white">{totalBookings}</div>
            <div className="text-xs text-ink-400 mt-1">Bookinger totalt</div>
          </div>
        </div>

        {/* Søk */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Søk etter klinikk, ID eller e-post…"
            className="w-full rounded-xl bg-ink-900 border border-ink-700 px-4 py-3 text-sm text-white placeholder-ink-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {/* Klinikk-liste */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 border-2 border-ink-700 border-t-white rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-400 bg-red-900/30 rounded-xl px-4 py-3 border border-red-800">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-700 py-12 text-center text-sm text-ink-500">
            {search ? "Ingen klinikker matcher søket." : "Ingen klinikker registrert ennå."}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Gruppering: Aktive først */}
            {[
              { label: "Aktive abonnement", filter: (c: Clinic) => c.subscription_status === "active" },
              { label: "Ikke aktivert", filter: (c: Clinic) => c.subscription_status === "inactive" },
              { label: "Avsluttet / betaling feilet", filter: (c: Clinic) => !["active","inactive"].includes(c.subscription_status) },
            ].map(group => {
              const rows = filtered.filter(group.filter);
              if (rows.length === 0) return null;
              return (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2 mt-4">{group.label} ({rows.length})</p>
                  <div className="space-y-2">
                    {rows.map(c => (
                      <ClinicRow
                        key={c.id}
                        clinic={c}
                        onOpen={() => openClinic(c.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inactive teller */}
        {inactive > 0 && !loading && !search && (
          <p className="mt-6 text-xs text-amber-500 text-center">
            {inactive} klinikk{inactive !== 1 ? "er" : ""} har ikke aktivert abonnement ennå
          </p>
        )}
      </main>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const [token, setToken] = useState<string | null>(null);

  // Husk innlogging i session
  useEffect(() => {
    const saved = sessionStorage.getItem("svarai_superadmin");
    if (saved) setToken(saved);
  }, []);

  function onAuth(pw: string) {
    sessionStorage.setItem("svarai_superadmin", pw);
    setToken(pw);
  }

  function onLogout() {
    sessionStorage.removeItem("svarai_superadmin");
    setToken(null);
  }

  if (!token) return <SuperLogin onAuth={onAuth} />;
  return <Dashboard token={token} onLogout={onLogout} />;
}
