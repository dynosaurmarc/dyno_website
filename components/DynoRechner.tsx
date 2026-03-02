"use client"

import React, { useEffect, useMemo, useState } from "react"
import { z } from "zod"
import { calculateAvDepot, type TaxationMode } from "../lib/calc/avDepot"
import { calculateBav, type BavInputMode } from "../lib/calc/bav"
import { compareScenarios } from "../lib/calc/compare"

type Tab = "depot" | "compare"
type ProfileId = "konservativ" | "ausgewogen" | "wachstum" | "offensiv"

type Profile = {
  id: ProfileId
  label: string
  avReturn: number
  avFee: number
  bavReturn: number
  bavFee: number
}

type FormState = {
  monthlyNetOutlay: number
  years: number
  avExpectedReturnPa: number
  avTotalFeePa: number
  bavExpectedReturnPa: number
  bavTotalFeePa: number
  marginalTaxRate: number
  taxRateInRetirement: number
  fullyDeferredTaxRate: number
  allowanceTier1Rate: number
  allowanceTier1Cap: number
  allowanceTier2Rate: number
  allowanceTier2Cap: number
  employerSubsidyRate: number
  netToGrossFactor: number
  grossConversion: number
  incomeTaxRateRetirement: number
  kvPvRateRetirement: number
}

const PROFILES: Profile[] = [
  { id: "konservativ", label: "Konservativ", avReturn: 0.04, avFee: 0.012, bavReturn: 0.035, bavFee: 0.013 },
  { id: "ausgewogen", label: "Ausgewogen", avReturn: 0.055, avFee: 0.0135, bavReturn: 0.05, bavFee: 0.014 },
  { id: "wachstum", label: "Wachstum", avReturn: 0.07, avFee: 0.015, bavReturn: 0.064, bavFee: 0.0155 },
  { id: "offensiv", label: "Offensiv", avReturn: 0.082, avFee: 0.0165, bavReturn: 0.075, bavFee: 0.017 },
]

const schema = z.object({
  monthlyNetOutlay: z.number().min(1).max(5000),
  years: z.number().min(1).max(50),
  avExpectedReturnPa: z.number().min(0).max(0.25),
  avTotalFeePa: z.number().min(0).max(0.15),
  bavExpectedReturnPa: z.number().min(0).max(0.25),
  bavTotalFeePa: z.number().min(0).max(0.15),
  marginalTaxRate: z.number().min(0).max(0.6),
  taxRateInRetirement: z.number().min(0).max(0.6),
  fullyDeferredTaxRate: z.number().min(0).max(0.6),
  allowanceTier1Rate: z.number().min(0).max(1),
  allowanceTier2Rate: z.number().min(0).max(1),
  employerSubsidyRate: z.number().min(0).max(1),
  incomeTaxRateRetirement: z.number().min(0).max(0.6),
  kvPvRateRetirement: z.number().min(0).max(0.6),
})

const TOKENS = {
  bg: "#01060F",
  panel: "#070E18",
  panel2: "#0A111D",
  text: "#FFFFFF",
  muted: "#A3AFBF",
  border: "rgba(255,255,255,0.12)",
  border2: "rgba(255,255,255,0.20)",
  primary: "#6500FF",
  accent: "#2FE2CF",
  gain: "#A6B4FF",
  warn: "#FFB020",
  danger: "#FF5D63",
  radius: 16,
}

export default function DynoRechner(props: {
  defaultNetOutlay?: number
  defaultYears?: number
  themePrimary?: string
  themeBg?: string
  themeText?: string
  radius?: number
  showChart?: boolean
}) {
  const [tab, setTab] = useState<Tab>("compare")
  const [profileId, setProfileId] = useState<ProfileId>("ausgewogen")
  const [expanded, setExpanded] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(true)
  const [taxationMode, setTaxationMode] = useState<TaxationMode>("tax_on_gains")
  const [bavMode, setBavMode] = useState<BavInputMode>("simple")
  const [showOwnContributions, setShowOwnContributions] = useState(true)

  const [form, setForm] = useState<FormState>(() => ({
    monthlyNetOutlay: props.defaultNetOutlay ?? 100,
    years: props.defaultYears ?? 30,
    avExpectedReturnPa: PROFILES[1].avReturn,
    avTotalFeePa: PROFILES[1].avFee,
    bavExpectedReturnPa: PROFILES[1].bavReturn,
    bavTotalFeePa: PROFILES[1].bavFee,
    marginalTaxRate: 0.42,
    taxRateInRetirement: 0.25,
    fullyDeferredTaxRate: 0.2,
    allowanceTier1Rate: 0.3,
    allowanceTier1Cap: 1200,
    allowanceTier2Rate: 0.2,
    allowanceTier2Cap: 600,
    employerSubsidyRate: 0.15,
    netToGrossFactor: 2.0077,
    grossConversion: 130.5,
    incomeTaxRateRetirement: 0.2,
    kvPvRateRetirement: 0.2,
  }))

  const tokens = {
    ...TOKENS,
    primary: props.themePrimary ?? TOKENS.primary,
    bg: props.themeBg ?? TOKENS.bg,
    text: props.themeText ?? TOKENS.text,
    radius: props.radius ?? TOKENS.radius,
  }

  useEffect(() => {
    const raw = window.localStorage.getItem("dyno-rechner-v4")
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Partial<FormState> & {
        profileId?: ProfileId
        tab?: Tab
        taxationMode?: TaxationMode
        bavMode?: BavInputMode
      }
      if (parsed.profileId) setProfileId(parsed.profileId)
      if (parsed.tab) setTab(parsed.tab)
      if (parsed.taxationMode) setTaxationMode(parsed.taxationMode)
      if (parsed.bavMode) setBavMode(parsed.bavMode)
      setForm((prev) => ({ ...prev, ...parsed }))
    } catch {
      // ignore invalid storage
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      "dyno-rechner-v4",
      JSON.stringify({ ...form, profileId, tab, taxationMode, bavMode }),
    )

    const params = new URLSearchParams(window.location.search)
    params.set("netto", String(form.monthlyNetOutlay))
    params.set("jahre", String(form.years))
    params.set("profil", profileId)
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`)
  }, [form, profileId, tab, taxationMode, bavMode])

  useEffect(() => {
    const selected = PROFILES.find((p) => p.id === profileId)
    if (!selected) return
    setForm((prev) => ({
      ...prev,
      avExpectedReturnPa: selected.avReturn,
      avTotalFeePa: selected.avFee,
      bavExpectedReturnPa: selected.bavReturn,
      bavTotalFeePa: selected.bavFee,
    }))
  }, [profileId])

  const validation = useMemo(() => schema.safeParse(form), [form])

  const comparison = useMemo(
    () =>
      compareScenarios(
        {
          monthlyNetOutlay: form.monthlyNetOutlay,
          years: form.years,
          expectedReturnPa: form.avExpectedReturnPa,
          totalFeePa: form.avTotalFeePa,
          marginalTaxRate: form.marginalTaxRate,
          taxRateInRetirement: form.taxRateInRetirement,
          taxationMode,
          fullyDeferredTaxRate: form.fullyDeferredTaxRate,
          allowanceTiers: [
            { rate: form.allowanceTier1Rate, cap: form.allowanceTier1Cap },
            { rate: form.allowanceTier2Rate, cap: form.allowanceTier2Cap },
          ],
        },
        {
          mode: bavMode,
          monthlyNetOutlay: form.monthlyNetOutlay,
          years: form.years,
          expectedReturnPa: form.bavExpectedReturnPa,
          totalFeePa: form.bavTotalFeePa,
          employerSubsidyRate: form.employerSubsidyRate,
          netToGrossFactor: form.netToGrossFactor,
          grossConversion: form.grossConversion,
          incomeTaxRateRetirement: form.incomeTaxRateRetirement,
          kvPvRateRetirement: form.kvPvRateRetirement,
        },
      ),
    [form, taxationMode, bavMode],
  )

  const avWarning = form.avExpectedReturnPa < form.avTotalFeePa
  const bavWarning = form.bavExpectedReturnPa < form.bavTotalFeePa

  const fmt = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v)

  const setNum = (k: keyof FormState, v: string) => {
    const n = Number(v.replace(",", "."))
    setForm((prev) => ({ ...prev, [k]: Number.isFinite(n) ? n : 0 }))
  }

  const setPercent = (k: keyof FormState, v: string) => {
    const n = Number(v.replace(",", "."))
    setForm((prev) => ({ ...prev, [k]: Number.isFinite(n) ? n / 100 : 0 }))
  }

  const av = comparison.avDepot
  const bav = comparison.bav

  const grossSeries = useMemo(
    () =>
      buildGrossSeries({
        years: form.years,
        monthlyOwn: form.monthlyNetOutlay,
        avMonthly: av.monthlyContribution,
        bavMonthly: bav.totalInvestedMonth,
        avMonthlyRate: (form.avExpectedReturnPa - form.avTotalFeePa) / 12,
        bavMonthlyRate: (form.bavExpectedReturnPa - form.bavTotalFeePa) / 12,
      }),
    [form, av.monthlyContribution, bav.totalInvestedMonth],
  )

  return (
    <div style={{ background: tokens.bg, color: tokens.text, minHeight: "100vh", padding: 22, fontFamily: "Poppins, Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, lineHeight: 1.5, color: tokens.muted }}>DYNO Rechner (Altersvorsorgedepot + bAV Vergleich)</div>
            <div style={{ fontSize: 56, fontWeight: 600, lineHeight: 1.1, letterSpacing: -1 }}>Performance, Kosten und Steuern vergleichen</div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Pill active={tab === "depot"} onClick={() => setTab("depot")} tokens={tokens}>Altersvorsorgedepot</Pill>
            <Pill active={tab === "compare"} onClick={() => setTab("compare")} tokens={tokens}>Vergleich mit DYNO bAV</Pill>
          </div>
        </div>

        <div style={gridMain}>
          <div style={{ display: "grid", gap: 14 }}>
            <Card tokens={tokens} title="Eingaben">
              <div style={grid2}>
                <Field tokens={tokens} label="Nettoaufwand pro Monat"><Input tokens={tokens} value={form.monthlyNetOutlay} onChange={(e) => setNum("monthlyNetOutlay", e.target.value)} /></Field>
                <Field tokens={tokens} label="Laufzeit in Jahren"><Input tokens={tokens} value={form.years} onChange={(e) => setNum("years", e.target.value)} /></Field>
                <Field tokens={tokens} label="Investmentoption / Risikoprofil">
                  <Select tokens={tokens} value={profileId} onChange={(e) => setProfileId(e.target.value as ProfileId)}>
                    {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </Select>
                </Field>
              </div>
            </Card>

            <Card tokens={tokens} title="Erweiterte Einstellungen">
              <details open={expanded} onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)}>
                <summary style={summaryStyle(tokens)}>{expanded ? "Ausblenden" : "Einblenden"}</summary>

                <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
                  <div style={grid2}>
                    <PercentField tokens={tokens} label="AV Depot Rendite p.a." value={form.avExpectedReturnPa} onChange={(v) => setPercent("avExpectedReturnPa", v)} />
                    <PercentField tokens={tokens} label="AV Depotgebühren p.a." value={form.avTotalFeePa} onChange={(v) => setPercent("avTotalFeePa", v)} />
                    <PercentField tokens={tokens} label="bAV Rendite p.a." value={form.bavExpectedReturnPa} onChange={(v) => setPercent("bavExpectedReturnPa", v)} />
                    <PercentField tokens={tokens} label="bAV Gebühren p.a." value={form.bavTotalFeePa} onChange={(v) => setPercent("bavTotalFeePa", v)} />

                    <PercentField tokens={tokens} label="Grenzsteuersatz" value={form.marginalTaxRate} onChange={(v) => setPercent("marginalTaxRate", v)} />
                    <PercentField tokens={tokens} label="Steuersatz Rente (Depot)" value={form.taxRateInRetirement} onChange={(v) => setPercent("taxRateInRetirement", v)} />

                    <PercentField tokens={tokens} label="Zulagen Stufe 1 (%)" value={form.allowanceTier1Rate} onChange={(v) => setPercent("allowanceTier1Rate", v)} />
                    <Field tokens={tokens} label="Zulagen Stufe 1 Cap €"><Input tokens={tokens} value={form.allowanceTier1Cap} onChange={(e) => setNum("allowanceTier1Cap", e.target.value)} /></Field>
                    <PercentField tokens={tokens} label="Zulagen Stufe 2 (%)" value={form.allowanceTier2Rate} onChange={(v) => setPercent("allowanceTier2Rate", v)} />
                    <Field tokens={tokens} label="Zulagen Stufe 2 Cap €"><Input tokens={tokens} value={form.allowanceTier2Cap} onChange={(e) => setNum("allowanceTier2Cap", e.target.value)} /></Field>

                    <Field tokens={tokens} label="Besteuerung Rentenphase (Depot)">
                      <Select tokens={tokens} value={taxationMode} onChange={(e) => setTaxationMode(e.target.value as TaxationMode)}>
                        <option value="tax_on_gains">nur Erträge besteuern</option>
                        <option value="fully_deferred">voll nachgelagert</option>
                      </Select>
                    </Field>
                    {taxationMode === "fully_deferred" && <PercentField tokens={tokens} label="Persönlicher Steuersatz" value={form.fullyDeferredTaxRate} onChange={(v) => setPercent("fullyDeferredTaxRate", v)} />}

                    <Field tokens={tokens} label="bAV-Modus">
                      <Select tokens={tokens} value={bavMode} onChange={(e) => setBavMode(e.target.value as BavInputMode)}>
                        <option value="simple">Simple (Netto → Brutto Faktor)</option>
                        <option value="detailed">Detailed</option>
                      </Select>
                    </Field>
                    <PercentField tokens={tokens} label="Arbeitgeberzuschuss" value={form.employerSubsidyRate} onChange={(v) => setPercent("employerSubsidyRate", v)} />
                    {bavMode === "simple" ? (
                      <Field tokens={tokens} label="Netto → Brutto Faktor"><Input tokens={tokens} step="0.0001" value={form.netToGrossFactor} onChange={(e) => setNum("netToGrossFactor", e.target.value)} /></Field>
                    ) : (
                      <Field tokens={tokens} label="Bruttoumwandlung €/Monat"><Input tokens={tokens} value={form.grossConversion} onChange={(e) => setNum("grossConversion", e.target.value)} /></Field>
                    )}
                    <PercentField tokens={tokens} label="Einkommensteuer Rente (bAV)" value={form.incomeTaxRateRetirement} onChange={(v) => setPercent("incomeTaxRateRetirement", v)} />
                    <PercentField tokens={tokens} label="KV/PV Rente (bAV)" value={form.kvPvRateRetirement} onChange={(v) => setPercent("kvPvRateRetirement", v)} />
                  </div>
                </div>
              </details>
            </Card>

            {!validation.success && <Alert tokens={tokens} kind="danger">Eingaben ungültig: {validation.error.issues[0]?.message}</Alert>}
            {(avWarning || bavWarning) && <Alert tokens={tokens} kind="warn">Warnung: Bei mindestens einem Produkt liegt Rendite unter Gebühren.</Alert>}
          </div>

          <Card tokens={tokens} title={tab === "compare" ? "Ergebnis: Depot vs bAV" : "Ergebnis: Altersvorsorgedepot"}>
            <div style={{ display: "grid", gap: 10 }}>
              <MetricRow tokens={tokens} label="Depot Netto-Endkapital" value={fmt(av.fvNet)} />
              <MetricRow tokens={tokens} label="bAV Netto-Endkapital" value={fmt(bav.fvNet)} />
              {tab === "compare" && (
                <div style={{ color: comparison.winner === "bav" ? tokens.accent : tokens.warn, fontWeight: 700 }}>
                  Delta: {comparison.winner === "bav" ? `bAV +${fmt(comparison.deltaNet)}` : `Depot +${fmt(Math.abs(comparison.deltaNet))}`}
                </div>
              )}
            </div>

            {props.showChart !== false && (
              <div style={{ marginTop: 16, border: `1px solid ${tokens.border}`, borderRadius: 14, padding: 14, background: tokens.panel2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <strong>Entwicklung des Brutto-Guthabens</strong>
                  <label style={{ fontSize: 13, color: tokens.muted, display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={showOwnContributions} onChange={(e) => setShowOwnContributions(e.target.checked)} />
                    Eigenbeiträge anzeigen
                  </label>
                </div>
                <DevelopmentChart series={grossSeries} tokens={tokens} showOwn={showOwnContributions} />
              </div>
            )}

            <details open={detailsOpen} onToggle={(e) => setDetailsOpen((e.target as HTMLDetailsElement).open)} style={{ marginTop: 12 }}>
              <summary style={summaryStyle(tokens)}>Berechnungsdetails</summary>
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                <MiniTable tokens={tokens} title="Altersvorsorgedepot" rows={[
                  ["Endkapital brutto", fmt(av.fvGross)],
                  ["Endkapital netto", fmt(av.fvNet)],
                  ["Ihr Eigenbeitrag", fmt(av.totalOwnPaid)],
                  ["Staatliche Zulagen", fmt(av.totalAllowancePaid)],
                  ["Reinvestierter Steuervorteil", fmt(av.totalTaxReinvestedPaid)],
                  ["Gesamtes Investitionsvolumen", fmt(av.totalInvested)],
                  ["Summe Erträge", fmt(av.totalEarnings)],
                  ["Summe Steuern", fmt(av.taxAtPayout)],
                ]} />
                {tab === "compare" && <MiniTable tokens={tokens} title="DYNO bAV" rows={[
                  ["Endkapital brutto", fmt(bav.fvGross)],
                  ["Endkapital netto", fmt(bav.fvNet)],
                  ["Einzahlungen (Netto)", fmt(bav.totalOwnPaid)],
                  ["AG-Zuschuss", fmt(bav.totalEmployerPaid)],
                  ["Investitionsvolumen gesamt", fmt(bav.totalInvested)],
                  ["Summe Erträge", fmt(bav.totalEarnings)],
                  ["Summe Steuern", fmt(bav.incomeTax)],
                  ["Summe KV/PV", fmt(bav.healthCare)],
                ]} />}
              </div>
            </details>
          </Card>
        </div>
      </div>
    </div>
  )
}

function buildGrossSeries(input: {
  years: number
  monthlyOwn: number
  avMonthly: number
  bavMonthly: number
  avMonthlyRate: number
  bavMonthlyRate: number
}) {
  const years = Math.max(1, Math.min(50, Math.round(input.years)))
  let avGross = 0
  let bavGross = 0
  let own = 0
  const points: { year: number; avGross: number; bavGross: number; own: number }[] = []

  for (let y = 1; y <= years; y += 1) {
    for (let m = 0; m < 12; m += 1) {
      avGross = (avGross + input.avMonthly) * (1 + input.avMonthlyRate)
      bavGross = (bavGross + input.bavMonthly) * (1 + input.bavMonthlyRate)
      own += input.monthlyOwn
    }
    points.push({ year: y, avGross, bavGross, own })
  }
  return points
}

function DevelopmentChart({ series, tokens, showOwn }: { series: { year: number; avGross: number; bavGross: number; own: number }[]; tokens: typeof TOKENS; showOwn: boolean }) {
  const width = 620
  const height = 260
  const pad = { left: 40, right: 12, top: 12, bottom: 34 }
  const maxY = Math.max(1, ...series.map((s) => Math.max(s.avGross, s.bavGross, s.own)))
  const x = (i: number) => pad.left + (i / Math.max(1, series.length - 1)) * (width - pad.left - pad.right)
  const y = (v: number) => height - pad.bottom - (v / maxY) * (height - pad.top - pad.bottom)

  const path = (key: "avGross" | "bavGross" | "own") => series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p[key])}`).join(" ")

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="260" role="img" aria-label="Entwicklung Brutto-Guthaben">
      {[0, 0.25, 0.5, 0.75, 1].map((r) => (
        <line key={r} x1={pad.left} y1={y(maxY * r)} x2={width - pad.right} y2={y(maxY * r)} stroke="rgba(255,255,255,0.12)" />
      ))}

      {showOwn && <path d={path("own")} stroke={tokens.accent} strokeWidth="2" fill="none" strokeDasharray="5 5" />}
      <path d={path("avGross")} stroke={tokens.primary} strokeWidth="3" fill="none" />
      <path d={path("bavGross")} stroke={tokens.gain} strokeWidth="3" fill="none" />

      <text x={pad.left} y={height - 10} fill={tokens.muted} fontSize="12">Jahre</text>
      <text x={pad.left} y={12} fill={tokens.muted} fontSize="12">Kapital (brutto)</text>
    </svg>
  )
}

function Card({ tokens, title, children }: { tokens: typeof TOKENS; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: tokens.panel, borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, padding: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 22, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function Pill({ tokens, active, onClick, children }: { tokens: typeof TOKENS; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ border: `1px solid ${active ? "transparent" : tokens.border2}`, background: active ? tokens.primary : "transparent", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 18, cursor: "pointer" }}>
      {children}
    </button>
  )
}

function Field({ tokens, label, children }: { tokens: typeof TOKENS; label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 8 }}><span style={{ fontSize: 14, color: tokens.muted }}>{label}</span>{children}</label>
}

function PercentField({ tokens, label, value, onChange }: { tokens: typeof TOKENS; label: string; value: number; onChange: (value: string) => void }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ fontSize: 14, color: tokens.muted }}>{label}</span>
      <input type="number" step="0.1" value={(value * 100).toFixed(2)} onChange={(e) => onChange(e.target.value)} style={inputStyle(tokens)} />
    </label>
  )
}

function Input({ tokens, value, onChange, step = "1" }: { tokens: typeof TOKENS; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; step?: string }) {
  return <input type="number" step={step} value={Number.isFinite(value) ? value : 0} onChange={onChange} style={inputStyle(tokens)} />
}

function Select({ tokens, value, onChange, children }: { tokens: typeof TOKENS; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }) {
  return <select value={value} onChange={onChange} style={inputStyle(tokens)}>{children}</select>
}

function Alert({ tokens, kind, children }: { tokens: typeof TOKENS; kind: "warn" | "danger"; children: React.ReactNode }) {
  const color = kind === "danger" ? tokens.danger : tokens.warn
  return <div style={{ border: `1px solid ${color}80`, borderRadius: 10, padding: "10px 12px", color: tokens.text }}>{children}</div>
}

function MetricRow({ tokens, label, value }: { tokens: typeof TOKENS; label: string; value: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: tokens.muted }}>{label}</span><strong>{value}</strong></div>
}

function MiniTable({ tokens, title, rows }: { tokens: typeof TOKENS; title: string; rows: [string, string][] }) {
  return (
    <div style={{ border: `1px solid ${tokens.border}`, borderRadius: 12, padding: 12, background: tokens.panel2 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "3px 0" }}>
          <span style={{ color: tokens.muted }}>{k}</span>
          <strong>{v}</strong>
        </div>
      ))}
    </div>
  )
}

function inputStyle(tokens: typeof TOKENS): React.CSSProperties {
  return {
    width: "100%",
    height: 42,
    borderRadius: 10,
    border: `1px solid ${tokens.border2}`,
    background: "rgba(255,255,255,0.04)",
    color: tokens.text,
    padding: "10px 12px",
    fontSize: 14,
    boxSizing: "border-box",
  }
}

function summaryStyle(tokens: typeof TOKENS): React.CSSProperties {
  return { cursor: "pointer", color: tokens.text, fontWeight: 600 }
}

const gridMain: React.CSSProperties = { display: "grid", gap: 14, gridTemplateColumns: "1.2fr 0.8fr" }
const grid2: React.CSSProperties = { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }
