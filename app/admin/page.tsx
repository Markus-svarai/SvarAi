"use client";

import { useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type Clinic = {
  id: string;
  name: string;
  type: string;
  tagline: string;
  address_street: string;
  address_postal: string;
  address_city: string;
  contact_phone: string;
  contact_email: string;
  contact_website: string;
  cancellation_policy: string;
  booking_lead_hours: number;
  subscription_status?: string;
};

type Service = {
  id: string;
  clinic_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_nok: number;
  active: boolean;
};

type Hour = {
  id?: string;
  clinic_id: string;
  day: string;
  sort_order: number;
  open: string | null;
  close: string | null;
};

type Booking = {
  id: string;
  service_name: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  staff_name?: string;
  created_at: string;
};

type StaffMember = {
  id: string;
  clinic_id: string;
  name: string;
  title: string | null;
  active: boolean;
  ical_url: string | null;
};

const DAYS = ["Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag","Søndag"];

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("nb-NO", { weekday: "short", day: "numeric", month: "short" });
}

function fmtCreated(iso: string) {
  return new Date(iso).toLocaleString("nb-NO", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ── API calls ──────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

// ── Login ──────────────────────────────────────────────────────────────────

function LoginGate({ onAuth }: { onAuth: (clinicId: string) => void }) {
  const [clinicId, setClinicId] = useState("demo");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId: clinicId.trim(), password: pw }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onAuth(data.clinicId);
      } else {
        setError(data.error ?? "Innlogging feilet.");
        setPw("");
      }
    } catch {
      setError("Kunne ikke koble til serveren.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-ink-100 shadow-card p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-lg bg-ink-900 text-white flex items-center justify-center font-bold text-sm">S</div>
          <span className="font-semibold text-ink-900">SvarAI Admin</span>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Klinikk-ID</label>
            <input
              type="text"
              value={clinicId}
              onChange={e => { setClinicId(e.target.value); setError(""); }}
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              placeholder="f.eks. rygge-tannklinikk"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Passord</label>
            <input
              type="password"
              value={pw}
              onChange={e => { setPw(e.target.value); setError(""); }}
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              placeholder="Skriv inn passord"
            />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-ink-900 text-white text-sm font-medium py-2.5 hover:bg-ink-800 transition disabled:opacity-60"
          >
            {loading ? "Logger inn…" : "Logg inn"}
          </button>
        </form>
        <p className="mt-4 text-xs text-ink-400 text-center">
          Fant du ID-en din i velkomst-e-posten eller på <a href="/registrer" className="underline hover:text-ink-600">/registrer</a>-siden.
        </p>
      </div>
    </div>
  );
}

// ── Tab: Bookinger ─────────────────────────────────────────────────────────

type StatusFilter = "all" | "pending" | "confirmed" | "cancelled";

function BookingsTab({ clinicId }: { clinicId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/api/admin/bookings?clinicId=${encodeURIComponent(clinicId)}`)
      .then(data => setBookings(data ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clinicId]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      await apiFetch("/api/admin/bookings", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdating(null);
    }
  }

  const statusColor = (s: string) =>
    s === "confirmed" ? "text-green-700 bg-green-50 border-green-100" :
    s === "cancelled"  ? "text-red-700 bg-red-50 border-red-100" :
    "text-amber-700 bg-amber-50 border-amber-100";

  const statusLabel = (s: string) =>
    s === "confirmed" ? "Bekreftet" :
    s === "cancelled"  ? "Avlyst" : "Venter";

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: "pending",   label: "Venter" },
    { key: "confirmed", label: "Bekreftet" },
    { key: "cancelled", label: "Avlyst" },
    { key: "all",       label: "Alle" },
  ];

  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);
  const pendingCount = bookings.filter(b => b.status === "pending").length;

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-ink-900">Bookinger</h2>
          {pendingCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {pendingCount} venter
            </span>
          )}
        </div>
        <span className="text-sm text-ink-500">{bookings.length} totalt</span>
      </div>

      {/* Statusfilter */}
      <div className="flex gap-1 mb-4 bg-ink-100 rounded-lg p-1 w-fit">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              filter === f.key
                ? "bg-white text-ink-900 shadow-sm"
                : "text-ink-500 hover:text-ink-900"
            }`}
          >
            {f.label}
            {f.key !== "all" && (
              <span className="ml-1 opacity-60">
                ({bookings.filter(b => b.status === f.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState text={filter === "all" ? "Ingen bookinger ennå." : `Ingen ${statusLabel(filter).toLowerCase()} bookinger.`} />
      ) : (
        <div className="space-y-2">
          {filtered.map(b => {
            const isUpdating = updating === b.id;
            return (
              <div key={b.id} className="rounded-xl border border-ink-100 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-semibold text-sm text-ink-900">{b.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusColor(b.status)}`}>
                        {statusLabel(b.status)}
                      </span>
                    </div>
                    <div className="text-sm text-ink-700">
                    {b.service_name} · {fmtDate(b.date)} kl. {b.time}
                    {b.staff_name && <span className="text-ink-400"> · {b.staff_name}</span>}
                  </div>
                    <div className="text-xs text-ink-500 mt-0.5 flex gap-3 flex-wrap">
                      <a href={`tel:${b.phone}`} className="hover:text-ink-900">{b.phone}</a>
                      <a href={`mailto:${b.email}`} className="hover:text-ink-900">{b.email}</a>
                    </div>
                  </div>
                  <div className="text-xs text-ink-400 whitespace-nowrap shrink-0">{fmtCreated(b.created_at)}</div>
                </div>

                {/* Handlingsknapper */}
                {b.status !== "cancelled" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-ink-100">
                    {b.status === "pending" && (
                      <button
                        onClick={() => updateStatus(b.id, "confirmed")}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition"
                      >
                        {isUpdating ? "…" : (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Bekreft
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`Avlys booking for ${b.name}?`)) updateStatus(b.id, "cancelled");
                      }}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                    >
                      {isUpdating ? "…" : (
                        <>
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Avlys
                        </>
                      )}
                    </button>
                    <div className="ml-auto text-xs text-ink-400 self-center">Ref: {b.id.slice(0, 8)}</div>
                  </div>
                )}
                {b.status === "cancelled" && (
                  <div className="flex justify-end mt-2">
                    <div className="text-xs text-ink-400">Ref: {b.id.slice(0, 8)}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab: Ansatte ───────────────────────────────────────────────────────────

function StaffTab({ clinicId }: { clinicId: string }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({ name: "", title: "", ical_url: "" });

  useEffect(() => {
    apiFetch(`/api/admin/staff?clinicId=${encodeURIComponent(clinicId)}`)
      .then(data => setStaff(data ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clinicId]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", title: "", ical_url: "" });
    setShowForm(true);
  }

  function openEdit(s: StaffMember) {
    setEditing(s);
    setForm({ name: s.name, title: s.title ?? "", ical_url: s.ical_url ?? "" });
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = editing
        ? { id: editing.id, clinic_id: clinicId, ...form }
        : { clinic_id: clinicId, ...form };
      const result = await apiFetch("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (editing) {
        setStaff(prev => prev.map(s => s.id === editing.id ? { ...s, ...form } : s));
      } else {
        setStaff(prev => [...prev, result]);
      }
      setShowForm(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: StaffMember) {
    try {
      await apiFetch("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify({ id: s.id, clinic_id: clinicId, name: s.name, title: s.title, active: !s.active }),
      });
      setStaff(prev => prev.map(m => m.id === s.id ? { ...m, active: !m.active } : m));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Slett denne ansatte? Eksisterende bookinger beholdes.")) return;
    try {
      await apiFetch(`/api/admin/staff?id=${id}`, { method: "DELETE" });
      setStaff(prev => prev.filter(s => s.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Ansatte</h2>
          <p className="text-xs text-ink-500 mt-0.5">Bookinger fordeles automatisk basert på hvem som er ledig.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-ink-900 text-white text-sm font-medium px-3 py-2 hover:bg-ink-800 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Legg til
        </button>
      </div>

      {error && <ErrorBox msg={error} />}

      {showForm && (
        <form onSubmit={save} className="mb-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4 space-y-3">
          <p className="text-sm font-semibold text-ink-900">{editing ? "Rediger ansatt" : "Ny ansatt"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-ink-700">Navn *</span>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="f.eks. Dr. Hansen"
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-700">Tittel</span>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="f.eks. Tannlege"
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-ink-700">Kalender-URL (iCal)</span>
              <input
                type="url"
                value={form.ical_url}
                onChange={e => setForm(f => ({ ...f, ical_url: e.target.value }))}
                placeholder="https://calendar.google.com/calendar/ical/..."
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              <p className="mt-1 text-xs text-ink-400">
                Lim inn iCal-lenke fra Google Calendar, Outlook, Visma eller annet system. Brukes til å unngå dobbeltbooking.
              </p>
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="rounded-lg bg-ink-900 text-white text-sm font-medium px-4 py-2 hover:bg-ink-800 disabled:opacity-60">
              {saving ? "Lagrer…" : "Lagre"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-ink-500 hover:text-ink-900 px-2">Avbryt</button>
          </div>
        </form>
      )}

      {staff.length === 0 ? (
        <EmptyState text="Ingen ansatte lagt til ennå. Legg til for å aktivere automatisk booking." />
      ) : (
        <div className="space-y-2">
          {staff.map(s => (
            <div key={s.id} className={`rounded-xl border bg-white p-4 flex items-center justify-between gap-4 ${s.active ? "border-ink-100" : "border-ink-100 opacity-60"}`}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-ink-100 flex items-center justify-center text-sm font-semibold text-ink-700">
                  {s.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink-900">{s.name}</div>
                  {s.title && <div className="text-xs text-ink-500">{s.title}</div>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.active ? "bg-green-50 text-green-700" : "bg-ink-100 text-ink-500"}`}>
                  {s.active ? "Aktiv" : "Inaktiv"}
                </span>
                {s.ical_url && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">
                    📅 Kalender synket
                  </span>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(s)} className="text-xs text-ink-600 hover:text-ink-900 border border-ink-200 rounded-lg px-2.5 py-1.5 hover:bg-ink-50 transition">
                  Rediger
                </button>
                <button onClick={() => toggleActive(s)} className="text-xs text-ink-600 hover:text-ink-900 border border-ink-200 rounded-lg px-2.5 py-1.5 hover:bg-ink-50 transition">
                  {s.active ? "Deaktiver" : "Aktiver"}
                </button>
                <button onClick={() => remove(s.id)} className="text-xs text-red-600 hover:text-red-800 border border-red-100 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition">
                  Slett
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Tjenester ─────────────────────────────────────────────────────────

function ServicesTab({ clinicId }: { clinicId: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState<Service | null>(null);
  const [showForm, setShowForm] = useState(false);

  const blank: Omit<Service, "id"> = {
    clinic_id: clinicId,
    name: "",
    description: "",
    duration_minutes: 30,
    price_nok: 0,
    active: true,
  };
  const [form, setForm] = useState<Omit<Service, "id">>(blank);

  useEffect(() => {
    apiFetch(`/api/admin/services?clinicId=${encodeURIComponent(clinicId)}`)
      .then(data => setServices(data ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clinicId]);

  function openNew() {
    setEditing(null);
    setForm({ ...blank, clinic_id: clinicId });
    setShowForm(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setForm({ clinic_id: s.clinic_id, name: s.name, description: s.description, duration_minutes: s.duration_minutes, price_nok: s.price_nok, active: s.active });
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(""); setSuccess("");
    try {
      const body = editing ? { ...form, id: editing.id } : form;
      const updated = await apiFetch("/api/admin/services", { method: "POST", body: JSON.stringify(body) });
      if (editing) {
        setServices(prev => prev.map(s => s.id === editing.id ? updated : s));
      } else {
        setServices(prev => [...prev, updated]);
      }
      setShowForm(false);
      setSuccess("Lagret.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Slett denne tjenesten?")) return;
    try {
      await apiFetch(`/api/admin/services?id=${id}`, { method: "DELETE" });
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-ink-900">Tjenester</h2>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-ink-900 text-white text-sm font-medium px-3 py-2 hover:bg-ink-800 transition">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Legg til
        </button>
      </div>

      {error && <ErrorBox msg={error} />}
      {success && <div className="mb-3 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{success}</div>}

      {showForm && (
        <form onSubmit={save} className="mb-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4 space-y-3">
          <p className="text-sm font-semibold text-ink-900">{editing ? "Rediger tjeneste" : "Ny tjeneste"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-ink-700">Navn</span>
              <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-700">Pris (kr)</span>
              <input required type="number" min={0} value={form.price_nok} onChange={e => setForm(f => ({...f, price_nok: Number(e.target.value)}))}
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-700">Varighet (min)</span>
              <input required type="number" min={5} step={5} value={form.duration_minutes} onChange={e => setForm(f => ({...f, duration_minutes: Number(e.target.value)}))}
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-700">Beskrivelse</span>
              <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="rounded-lg bg-ink-900 text-white text-sm font-medium px-4 py-2 hover:bg-ink-800 disabled:opacity-60">
              {saving ? "Lagrer…" : "Lagre"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-ink-500 hover:text-ink-900 px-2">Avbryt</button>
          </div>
        </form>
      )}

      {services.length === 0 ? (
        <EmptyState text="Ingen tjenester ennå. Legg til en!" />
      ) : (
        <div className="space-y-2">
          {services.map(s => (
            <div key={s.id} className="rounded-xl border border-ink-100 bg-white p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-ink-900">{s.name}</div>
                <div className="text-xs text-ink-500">{s.duration_minutes} min · {s.price_nok.toLocaleString("nb-NO")} kr</div>
                {s.description && <div className="text-xs text-ink-400 mt-0.5">{s.description}</div>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(s)} className="text-xs text-ink-600 hover:text-ink-900 border border-ink-200 rounded-lg px-2.5 py-1.5 hover:bg-ink-50 transition">
                  Rediger
                </button>
                <button onClick={() => remove(s.id)} className="text-xs text-red-600 hover:text-red-800 border border-red-100 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition">
                  Slett
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Åpningstider ──────────────────────────────────────────────────────

function HoursTab({ clinicId }: { clinicId: string }) {
  const [hours, setHours] = useState<Hour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    apiFetch(`/api/admin/hours?clinicId=${encodeURIComponent(clinicId)}`)
      .then(data => {
        const fetched: Hour[] = data ?? [];
        const merged = DAYS.map((day, i) => {
          const existing = fetched.find(h => h.day === day);
          return existing ?? { clinic_id: clinicId, day, sort_order: i, open: null, close: null };
        });
        setHours(merged);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clinicId]);

  function update(day: string, field: "open" | "close", value: string | null) {
    setHours(prev => prev.map(h => h.day === day ? { ...h, [field]: value || null } : h));
  }

  function toggleDay(day: string, open: boolean) {
    setHours(prev => prev.map(h => h.day === day
      ? { ...h, open: open ? "08:00" : null, close: open ? "17:00" : null }
      : h
    ));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(""); setSuccess("");
    try {
      await apiFetch("/api/admin/hours", {
        method: "POST",
        body: JSON.stringify({ clinicId, hours }),
      });
      setSuccess("Åpningstider lagret!");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink-900 mb-4">Åpningstider</h2>
      {error && <ErrorBox msg={error} />}
      {success && <div className="mb-3 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{success}</div>}
      <form onSubmit={save}>
        <div className="rounded-xl border border-ink-100 bg-white overflow-hidden">
          {hours.map((h, i) => {
            const isOpen = Boolean(h.open);
            return (
              <div key={h.day} className={`flex items-center gap-3 px-4 py-3 ${i < hours.length - 1 ? "border-b border-ink-100" : ""}`}>
                <div className="w-24 text-sm font-medium text-ink-900">{h.day}</div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    onChange={e => toggleDay(h.day, e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs text-ink-600">{isOpen ? "Åpent" : "Stengt"}</span>
                </label>
                {isOpen && (
                  <div className="flex items-center gap-2 ml-auto">
                    <input
                      type="time"
                      value={h.open ?? ""}
                      onChange={e => update(h.day, "open", e.target.value)}
                      className="rounded-lg border border-ink-200 px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500"
                    />
                    <span className="text-ink-400 text-xs">–</span>
                    <input
                      type="time"
                      value={h.close ?? ""}
                      onChange={e => update(h.day, "close", e.target.value)}
                      className="rounded-lg border border-ink-200 px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <button type="submit" disabled={saving} className="rounded-lg bg-ink-900 text-white text-sm font-medium px-5 py-2.5 hover:bg-ink-800 disabled:opacity-60">
            {saving ? "Lagrer…" : "Lagre åpningstider"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Tab: Klinikk-info ──────────────────────────────────────────────────────

function ClinicTab({ clinicId }: { clinicId: string }) {
  const [form, setForm] = useState<Partial<Clinic>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    apiFetch(`/api/admin/clinic?clinicId=${encodeURIComponent(clinicId)}`)
      .then(data => setForm(data ?? {}))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clinicId]);

  function set(field: keyof Clinic, value: any) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(""); setSuccess("");
    try {
      await apiFetch("/api/admin/clinic", {
        method: "POST",
        body: JSON.stringify({ ...form, id: clinicId }),
      });
      setSuccess("Klinikk-info lagret!");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  const field = (label: string, key: keyof Clinic, type = "text") => (
    <label className="block">
      <span className="text-xs font-medium text-ink-700">{label}</span>
      <input
        type={type}
        value={(form[key] as string) ?? ""}
        onChange={e => set(key, e.target.value)}
        className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      />
    </label>
  );

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink-900 mb-4">Klinikk-info</h2>
      {error && <ErrorBox msg={error} />}
      {success && <div className="mb-3 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{success}</div>}
      <form onSubmit={save} className="space-y-5">
        <Section title="Grunninfo">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field("Klinikkens navn", "name")}
            {field("Tagline", "tagline")}
          </div>
        </Section>

        <Section title="Adresse">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {field("Gate", "address_street")}
            {field("Postnummer", "address_postal")}
            {field("By", "address_city")}
          </div>
        </Section>

        <Section title="Kontakt">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {field("Telefon", "contact_phone", "tel")}
            {field("E-post", "contact_email", "email")}
            {field("Nettside", "contact_website")}
          </div>
        </Section>

        <Section title="Bookinginnstillinger">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-ink-700">Min. varsel (timer)</span>
              <input
                type="number" min={0}
                value={form.booking_lead_hours ?? 2}
                onChange={e => set("booking_lead_hours", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-700">Avbestillingspolicy</span>
              <textarea
                rows={2}
                value={form.cancellation_policy ?? ""}
                onChange={e => set("cancellation_policy", e.target.value)}
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none"
              />
            </label>
          </div>
        </Section>

        <button type="submit" disabled={saving} className="rounded-lg bg-ink-900 text-white text-sm font-medium px-5 py-2.5 hover:bg-ink-800 disabled:opacity-60">
          {saving ? "Lagrer…" : "Lagre endringer"}
        </button>
      </form>
    </div>
  );
}

// ── Shared UI ──────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="rounded-xl border border-ink-100 bg-white p-4">{children}</div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="h-6 w-6 border-2 border-ink-200 border-t-ink-600 rounded-full animate-spin" />
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="mb-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 border border-red-100">{msg}</div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-200 py-10 text-center text-sm text-ink-400">{text}</div>
  );
}

// ── Subscription Badge ─────────────────────────────────────────────────────

function SubscriptionBadge({ clinicId }: { clinicId: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    apiFetch(`/api/admin/clinic?clinicId=${encodeURIComponent(clinicId)}`)
      .then(data => setStatus(data?.subscription_status ?? "inactive"))
      .catch(() => {});
  }, [clinicId]);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await apiFetch("/api/stripe/portal", {
        method: "POST",
        body: JSON.stringify({ clinicId }),
      });
      if (res?.url) window.location.href = res.url;
    } catch {
      // Ignorer feil stille
    } finally {
      setPortalLoading(false);
    }
  }

  if (!status) return null;

  const cfg = {
    active:    { label: "Aktiv",         color: "bg-green-50 text-green-700 border-green-100" },
    past_due:  { label: "Betaling feilet", color: "bg-red-50 text-red-700 border-red-100" },
    cancelled: { label: "Avsluttet",     color: "bg-ink-100 text-ink-500 border-ink-200" },
    inactive:  { label: "Ikke aktivert", color: "bg-amber-50 text-amber-700 border-amber-100" },
  }[status] ?? { label: status, color: "bg-ink-100 text-ink-500 border-ink-200" };

  return (
    <button
      onClick={openPortal}
      disabled={portalLoading || status === "inactive"}
      title={status === "inactive" ? "Ingen aktiv betaling" : "Administrer abonnement"}
      className={`text-xs px-2.5 py-1 rounded-full font-medium border transition ${cfg.color} ${status !== "inactive" ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}
    >
      {portalLoading ? "…" : cfg.label}
    </button>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: "bookings",  label: "Bookinger" },
  { id: "staff",     label: "Ansatte" },
  { id: "services",  label: "Tjenester" },
  { id: "hours",     label: "Åpningstider" },
  { id: "clinic",    label: "Klinikk-info" },
];

export default function AdminPage() {
  const [clinicId, setClinicId] = useState("");
  const [tab, setTab] = useState("bookings");

  if (!clinicId) return <LoginGate onAuth={id => setClinicId(id)} />;

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-ink-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-ink-900 text-white flex items-center justify-center font-bold text-sm">S</div>
            <span className="font-semibold text-ink-900 text-sm">SvarAI</span>
            <span className="text-ink-300 text-sm">·</span>
            <span className="text-sm text-ink-500">{clinicId}</span>
          </div>
            <div className="flex items-center gap-3">
            <SubscriptionBadge clinicId={clinicId} />
            <button
              onClick={() => setClinicId("")}
              className="text-xs text-ink-500 hover:text-ink-900 transition"
            >
              Logg ut
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <nav className="flex gap-1 -mb-px">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  tab === t.id
                    ? "border-ink-900 text-ink-900"
                    : "border-transparent text-ink-500 hover:text-ink-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        {tab === "bookings"  && <BookingsTab clinicId={clinicId} />}
        {tab === "staff"     && <StaffTab    clinicId={clinicId} />}
        {tab === "services"  && <ServicesTab clinicId={clinicId} />}
        {tab === "hours"     && <HoursTab    clinicId={clinicId} />}
        {tab === "clinic"    && <ClinicTab   clinicId={clinicId} />}
      </main>
    </div>
  );
}
