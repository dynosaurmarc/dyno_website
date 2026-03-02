"use client"

import React, { useEffect, useMemo, useState } from "react"
import { z } from "zod"
import { type TaxationMode } from "../lib/calc/avDepot"
import { type BavInputMode } from "../lib/calc/bav"
import { compareScenarios } from "../lib/calc/compare"

const DesignTokens = {
  primary: "#155EEF",
  bg: "#FFFFFF",
  text: "#101828",
  mutedText: "#475467",
  border: "#D0D5DD",
  softBg: "#F9FAFB",
  success: "#067647",
  danger: "#B42318",
  radius: 16,
  shadow: "0 8px 30px rgba(16,24,40,0.08)",
  spacing: 16,
} as const

type Profile = {
  id: string
  label: string
  expectedReturnPa: number
  totalFeePa: number
}

const PROFILES: Profile[] = [
  { id: "konservativ", label: "Konservativ", expectedReturnPa: 0.04, totalFeePa: 0.012 },
  { id: "ausgewogen", label: "Ausgewogen", expectedReturnPa: 0.055, totalFeePa: 0.0135 },
  { id: "wachstum", label: "Wachstum", expectedReturnPa: 0.07, totalFeePa: 0.015 },
  { id: "offensiv", label: "Offensiv", expectedReturnPa: 0.082, totalFeePa: 0.0165 },
]

const schema = z.object({
  monthlyNetOutlay: z.number().min(1).max(5000),
  years: z.number().min(1).max(50),
  expectedReturnPa: z.number().min(0).max(0.2),
  totalFeePa: z.number().min(0).max(0.1),
  marginalTaxRate: z.number().min(0).max(0.6),
  taxRateInRetirement: z.number().min(0).max(0.6),
  incomeTaxRateRetirement: z.number().min(0).max(0.6),
  kvPvRateRetirement: z.number().min(0).max(0.6),
})

type Tab = "depot" | "compare"

type FormState = {
  monthlyNetOutlay: number
  years: number
  expectedReturnPa: number
  totalFeePa: number
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

type Props = {
  defaultNetOutlay?: number
  defaultYears?: number
  themePrimary?: string
  themeBg?: string
  themeText?: string
  radius?: number
  showChart?: boolean
}

export default function DynoRechner(props: Props) {
  const [tab, setTab] = useState<Tab>("depot")
  const [profileId, setProfileId] = useState<string>(PROFILES[1].id)
  const [expanded, setExpanded] = useState(false)
  const [taxationMode, setTaxationMode] = useState<TaxationMode>("tax_on_gains")
  const [bavMode, setBavMode] = useState<BavInputMode>("simple")

  const [form, setForm] = useState<FormState>(() => ({
    monthlyNetOutlay: props.defaultNetOutlay ?? 65,
    years: props.defaultYears ?? 30,
    expectedReturnPa: PROFILES[1].expectedReturnPa,
    totalFeePa: PROFILES[1].totalFeePa,
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

  const validation = useMemo(
    () =>
      schema.safeParse({
        monthlyNetOutlay: form.monthlyNetOutlay,
        years: form.years,
        expectedReturnPa: form.expectedReturnPa,
        totalFeePa: form.totalFeePa,
        marginalTaxRate: form.marginalTaxRate,
        taxRateInRetirement: form.taxRateInRetirement,
        incomeTaxRateRetirement: form.incomeTaxRateRetirement,
        kvPvRateRetirement: form.kvPvRateRetirement,
      }),
    [form],
  )

  useEffect(() => {
    const raw = window.localStorage.getItem("dyno-rechner-v1")
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Partial<FormState>
      setForm((prev) => ({ ...prev, ...parsed }))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem("dyno-rechner-v1", JSON.stringify(form))
    const params = new URLSearchParams(window.location.search)
    params.set("netto", String(form.monthlyNetOutlay))
    params.set("jahre", String(form.years))
    params.set("profil", String(profileId))
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`)
  }, [form, profileId])

  useEffect(() => {
    const selected = PROFILES.find((p) => p.id === profileId)
    if (!selected) return
    setForm((prev) => ({
      ...prev,
      expectedReturnPa: selected.expectedReturnPa,
      totalFeePa: selected.totalFeePa,
    }))
  }, [profileId])

  const comparison = useMemo(
    () =>
      compareScenarios(
        {
          monthlyNetOutlay: form.monthlyNetOutlay,
          years: form.years,
          expectedReturnPa: form.expectedReturnPa,
          totalFeePa: form.totalFeePa,
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
          expectedReturnPa: form.expectedReturnPa,
          totalFeePa: form.totalFeePa,
          employerSubsidyRate: form.employerSubsidyRate,
          netToGrossFactor: form.netToGrossFactor,
          grossConversion: form.grossConversion,
          incomeTaxRateRetirement: form.incomeTaxRateRetirement,
          kvPvRateRetirement: form.kvPvRateRetirement,
        },
      ),
    [form, taxationMode, bavMode],
  )

  const warning = form.expectedReturnPa < form.totalFeePa ? "Warnung: Negative Wachstumsannahme (Rendite < Kosten)." : null

  const tokens = {
    primary: props.themePrimary ?? DesignTokens.primary,
    bg: props.themeBg ?? DesignTokens.bg,
    text: props.themeText ?? DesignTokens.text,
    radius: props.radius ?? DesignTokens.radius,
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v)

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`

  const setNum = (k: keyof FormState, raw: string) => {
    const n = raw === "" ? 0 : Number(raw)
    setForm((prev) => ({ ...prev, [k]: Number.isFinite(n) ? n : prev[k] }))
  }

  const av = comparison.avDepot
  const bav = comparison.bav

  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        background: tokens.bg,
        color: tokens.text,
        borderRadius: tokens.radius,
        boxShadow: DesignTokens.shadow,
        padding: 20,
        border: `1px solid ${DesignTokens.border}`,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 16,
          background: DesignTokens.softBg,
          padding: 6,
          borderRadius: 999,
        }}
      >
        <button onClick={() => setTab("depot")} style={segStyle(tab === "depot", tokens.primary)}>
          Altersvorsorgedepot (gefördert)
        </button>
        <button onClick={() => setTab("compare")} style={segStyle(tab === "compare", tokens.primary)}>
          Vergleich mit DYNO bAV
        </button>
      </div>

      <div style={grid2}>
        <Field label="Nettoaufwand pro Monat" help="Ihr tatsächlicher Nettoaufwand.">
          <input
            type="number"
            value={form.monthlyNetOutlay}
            min={1}
            onChange={(e) => setNum("monthlyNetOutlay", e.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="Laufzeit in Jahren">
          <input type="number" value={form.years} min={1} max={50} onChange={(e) => setNum("years", e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Investmentoption / Risikoprofil">
          <select value={profileId} onChange={(e) => setProfileId(e.target.value)} style={inputStyle}>
            {PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <details open={expanded} onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)} style={{ margin: "14px 0" }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Erweiterte Einstellungen</summary>

        <div style={{ marginTop: 12, ...grid2 }}>
          <Field label="Erwartete Rendite p.a.">
            <input type="number" step="0.001" value={form.expectedReturnPa} onChange={(e) => setNum("expectedReturnPa", e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Produktkosten p.a. (Effektivkosten)">
            <input type="number" step="0.001" value={form.totalFeePa} onChange={(e) => setNum("totalFeePa", e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Grenzsteuersatz" help="Einzahlungsphase">
            <input type="number" step="0.01" value={form.marginalTaxRate} onChange={(e) => setNum("marginalTaxRate", e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Steuersatz in Rentenphase">
            <input type="number" step="0.01" value={form.taxRateInRetirement} onChange={(e) => setNum("taxRateInRetirement", e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Zulagen Stufe 1 (Rate / Cap)">
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" step="0.01" value={form.allowanceTier1Rate} onChange={(e) => setNum("allowanceTier1Rate", e.target.value)} style={inputStyle} />
              <input type="number" value={form.allowanceTier1Cap} onChange={(e) => setNum("allowanceTier1Cap", e.target.value)} style={inputStyle} />
            </div>
          </Field>

          <Field label="Zulagen Stufe 2 (Rate / Cap)">
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" step="0.01" value={form.allowanceTier2Rate} onChange={(e) => setNum("allowanceTier2Rate", e.target.value)} style={inputStyle} />
              <input type="number" value={form.allowanceTier2Cap} onChange={(e) => setNum("allowanceTier2Cap", e.target.value)} style={inputStyle} />
            </div>
          </Field>

          <Field label="Besteuerung Rentenphase">
            <select value={taxationMode} onChange={(e) => setTaxationMode(e.target.value as TaxationMode)} style={inputStyle}>
              <option value="tax_on_gains">nur Erträge besteuern</option>
              <option value="fully_deferred">voll nachgelagert</option>
            </select>
          </Field>

          {taxationMode === "fully_deferred" && (
            <Field label="Persönlicher Steuersatz (voll nachgelagert)">
              <input type="number" step="0.01" value={form.fullyDeferredTaxRate} onChange={(e) => setNum("fullyDeferredTaxRate", e.target.value)} style={inputStyle} />
            </Field>
          )}

          <Field label="bAV-Modus">
            <select value={bavMode} onChange={(e) => setBavMode(e.target.value as BavInputMode)} style={inputStyle}>
              <option value="simple">Simple (Netto → Brutto Faktor)</option>
              <option value="detailed">Detailed</option>
            </select>
          </Field>

          <Field label="Arbeitgeberzuschuss">
            <input type="number" step="0.01" value={form.employerSubsidyRate} onChange={(e) => setNum("employerSubsidyRate", e.target.value)} style={inputStyle} />
          </Field>

          {bavMode === "simple" ? (
            <Field label="Netto → Brutto Faktor">
              <input type="number" step="0.0001" value={form.netToGrossFactor} onChange={(e) => setNum("netToGrossFactor", e.target.value)} style={inputStyle} />
            </Field>
          ) : (
            <Field label="Bruttoumwandlung €/Monat">
              <input type="number" value={form.grossConversion} onChange={(e) => setNum("grossConversion", e.target.value)} style={inputStyle} />
            </Field>
          )}

          <Field label="Einkommensteuer in Rente (bAV)">
            <input type="number" step="0.01" value={form.incomeTaxRateRetirement} onChange={(e) => setNum("incomeTaxRateRetirement", e.target.value)} style={inputStyle} />
          </Field>

          <Field label="KV/PV in Rente (bAV)">
            <input type="number" step="0.01" value={form.kvPvRateRetirement} onChange={(e) => setNum("kvPvRateRetirement", e.target.value)} style={inputStyle} />
          </Field>
        </div>
      </details>

      {!validation.success && <div style={alertStyle(DesignTokens.danger)}>Eingaben ungültig: {validation.error.issues[0]?.message}</div>}
      {warning && <div style={alertStyle("#B54708")}>{warning}</div>}

      <div style={cards}>
        <ResultCard
          title="Altersvorsorgedepot"
          lines={[
            ["Endkapital brutto", fmt(av.fvGross)],
            ["Endkapital netto", fmt(av.fvNet)],
            ["Ihr Eigenbeitrag", fmt(av.totalOwnPaid)],
            ["Staatliche Zulagen", fmt(av.totalAllowancePaid)],
            ["Reinvestierter Steuervorteil", fmt(av.totalTaxReinvestedPaid)],
            ["Gesamtes Investitionsvolumen", fmt(av.totalInvested)],
            ["Summe Erträge", fmt(av.totalEarnings)],
            ["Summe Steuern", fmt(av.taxAtPayout)],
          ]}
        />

        {tab === "compare" && (
          <ResultCard
            title="DYNO bAV"
            lines={[
              ["Endkapital brutto", fmt(bav.fvGross)],
              ["Endkapital netto", fmt(bav.fvNet)],
              ["Einzahlungen (Netto)", fmt(bav.totalOwnPaid)],
              ["AG-Zuschuss", fmt(bav.totalEmployerPaid)],
              ["Investitionsvolumen gesamt", fmt(bav.totalInvested)],
              ["Summe Erträge", fmt(bav.totalEarnings)],
              ["Summe Steuern", fmt(bav.incomeTax)],
              ["Summe KV/PV", fmt(bav.healthCare)],
              ["Abzüge gesamt", `${fmt(bav.totalDeductions)} (${pct(form.incomeTaxRateRetirement)} Steuer + ${pct(form.kvPvRateRetirement)} KV/PV)`],
            ]}
          />
        )}
      </div>

      {tab === "compare" && (
        <div style={{ marginTop: 14, fontWeight: 700, color: comparison.winner === "bav" ? DesignTokens.success : DesignTokens.danger }}>
          Delta:{" "}
          {comparison.winner === "equal"
            ? "Gleichstand"
            : comparison.winner === "bav"
              ? `bAV +${fmt(comparison.deltaNet)}`
              : `Depot +${fmt(Math.abs(comparison.deltaNet))}`}
        </div>
      )}

      {props.showChart && <SimpleChart av={av.fvNet} bav={bav.fvNet} compare={tab === "compare"} />}
    </div>
  )
}

function SimpleChart({ av, bav, compare }: { av: number; bav: number; compare: boolean }) {
  const max = Math.max(av, bav, 1)
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Vermögensentwicklung (vereinfacht)</div>
      <svg viewBox="0 0 300 120" width="100%" height="120">
        <rect x="0" y="0" width="300" height="120" fill="#F8FAFC" rx="12" />
        <line x1="20" y1="100" x2="280" y2="20" stroke="#155EEF" strokeWidth="3" />
        {compare && <line x1="20" y1="100" x2="280" y2={100 - (bav / max) * 80} stroke="#12B76A" strokeWidth="3" />}
      </svg>
    </div>
  )
}

function Field({ label, children, help }: { label: string; children: React.ReactNode; help?: string }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
      <span style={{ fontWeight: 600 }}>
        {label}
        {help ? ` ⓘ ${help}` : ""}
      </span>
      {children}
    </label>
  )
}

function ResultCard({ title, lines }: { title: string; lines: [string, string][] }) {
  return (
    <div style={{ border: "1px solid #EAECF0", borderRadius: 14, padding: 14, background: "#fff" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {lines.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", gap: 12 }}>
          <span style={{ color: "#475467" }}>{k}</span>
          <strong>{v}</strong>
        </div>
      ))}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #D0D5DD",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  width: "100%",
  background: "#fff",
}

const grid2: React.CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
}

const cards: React.CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
}

const segStyle = (active: boolean, primary: string): React.CSSProperties => ({
  border: "none",
  borderRadius: 999,
  padding: "10px 14px",
  fontWeight: 600,
  background: active ? primary : "transparent",
  color: active ? "#fff" : "#344054",
  cursor: "pointer",
})

const alertStyle = (color: string): React.CSSProperties => ({
  background: `${color}15`,
  border: `1px solid ${color}55`,
  color,
  borderRadius: 12,
  padding: "8px 12px",
  margin: "10px 0",
})
