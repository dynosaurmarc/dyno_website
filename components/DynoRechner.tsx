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
  expectedReturnPa: number
  totalFeePa: number
}

const PROFILES: Profile[] = [
  { id: "konservativ", label: "Konservativ", expectedReturnPa: 0.04, totalFeePa: 0.012 },
  { id: "ausgewogen", label: "Ausgewogen", expectedReturnPa: 0.055, totalFeePa: 0.0135 },
  { id: "wachstum", label: "Wachstum", expectedReturnPa: 0.07, totalFeePa: 0.015 },
  { id: "offensiv", label: "Offensiv", expectedReturnPa: 0.082, totalFeePa: 0.0165 },
]

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

const schema = z.object({
  monthlyNetOutlay: z.number().min(1).max(5000),
  years: z.number().min(1).max(60),
  expectedReturnPa: z.number().min(0).max(0.25),
  totalFeePa: z.number().min(0).max(0.15),
  marginalTaxRate: z.number().min(0).max(0.6),
  taxRateInRetirement: z.number().min(0).max(0.6),
  incomeTaxRateRetirement: z.number().min(0).max(0.6),
  kvPvRateRetirement: z.number().min(0).max(0.6),
})

/**
 * Scalable-like Dark tokens (kannst du später auf DYNO Brand ziehen)
 */
type Tokens = {
  bg: string
  panel: string
  panel2: string
  text: string
  muted: string
  border: string
  border2: string
  primary: string
  accent: string
  danger: string
  warn: string
  shadow: string
  radius: number
}

const TOKENS: Tokens = {
  bg: "#0B0F14",
  panel: "#0F1621",
  panel2: "#111B28",
  text: "#E6EEF8",
  muted: "#9BB0C9",
  border: "rgba(255,255,255,0.10)",
  border2: "rgba(255,255,255,0.16)",
  primary: "#155EEF",
  accent: "#24E0C2",
  danger: "#FF4D4F",
  warn: "#FFB020",
  shadow: "0 18px 60px rgba(0,0,0,0.45)",
  radius: 18,
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
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [taxationMode, setTaxationMode] = useState<TaxationMode>("tax_on_gains")
  const [bavMode, setBavMode] = useState<BavInputMode>("simple")

  const tokens = {
    ...TOKENS,
    primary: props.themePrimary ?? TOKENS.primary,
    bg: props.themeBg ?? TOKENS.bg,
    text: props.themeText ?? TOKENS.text,
    radius: props.radius ?? TOKENS.radius,
  }

  const [form, setForm] = useState<FormState>(() => {
    const base: FormState = {
      monthlyNetOutlay: props.defaultNetOutlay ?? 100,
      years: props.defaultYears ?? 30,
      expectedReturnPa: PROFILES.find((p) => p.id === profileId)?.expectedReturnPa ?? 0.055,
      totalFeePa: PROFILES.find((p) => p.id === profileId)?.totalFeePa ?? 0.0135,

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
    }
    return base
  })

  // Local storage restore
  useEffect(() => {
    const raw = window.localStorage.getItem("dyno-rechner-v2")
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Partial<FormState> & { profileId?: ProfileId; tab?: Tab }
      if (parsed.profileId) setProfileId(parsed.profileId)
      if (parsed.tab) setTab(parsed.tab)
      setForm((prev) => ({ ...prev, ...parsed }))
    } catch {
      // ignore
    }
  }, [])

  // Persist
  useEffect(() => {
    window.localStorage.setItem(
      "dyno-rechner-v2",
      JSON.stringify({ ...form, profileId, tab })
    )
  }, [form, profileId, tab])

  // Keep return+fee aligned with profile (Scalable-like “Risikoprofil” selection)
  useEffect(() => {
    const selected = PROFILES.find((p) => p.id === profileId)
    if (!selected) return
    setForm((prev) => ({
      ...prev,
      expectedReturnPa: selected.expectedReturnPa,
      totalFeePa: selected.totalFeePa,
    }))
  }, [profileId])

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
    [form]
  )

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
        }
      ),
    [form, taxationMode, bavMode]
  )

  const warning =
    form.expectedReturnPa < form.totalFeePa
      ? "Warnung: Renditeannahme liegt unter Kostenannahme (negatives Wachstum möglich)."
      : null

  const fmt = (v: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(v)

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`

  const setNum = (k: keyof FormState, v: string) => {
    const n = Number(v)
    setForm((prev) => ({ ...prev, [k]: Number.isFinite(n) ? n : 0 }))
  }

  const av = comparison.avDepot
  const bav = comparison.bav

  // For the “förderung” bar in the right panel
  const avFunding = Math.max(0, (av.totalAllowancePaid ?? 0) + (av.totalTaxReinvestedPaid ?? 0))

  return (
    <div style={{ background: tokens.bg, color: tokens.text, minHeight: "100vh", padding: 22 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, color: tokens.muted, marginBottom: 6 }}>
              DYNO Rechner (Altersvorsorgedepot + bAV Vergleich)
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.4 }}>
              Altersvorsorge vergleichen — wie bei Scalable, nur mit bAV
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Pill active={tab === "depot"} onClick={() => setTab("depot")} tokens={tokens}>
              Altersvorsorgedepot
            </Pill>
            <Pill active={tab === "compare"} onClick={() => setTab("compare")} tokens={tokens}>
              Vergleich mit DYNO bAV
            </Pill>
          </div>
        </div>

        {/* Main grid */}
        <div style={gridMain}>
          {/* Left: Inputs */}
          <div style={{ display: "grid", gap: 14 }}>
            <Card tokens={tokens} title="Eingaben">
              <div style={grid2}>
                <Field tokens={tokens} label="Nettoaufwand pro Monat" help="Ihr tatsächlicher Nettoaufwand">
                  <Input tokens={tokens} value={form.monthlyNetOutlay} onChange={(e) => setNum("monthlyNetOutlay", e.target.value)} />
                </Field>

                <Field tokens={tokens} label="Laufzeit in Jahren">
                  <Input tokens={tokens} value={form.years} onChange={(e) => setNum("years", e.target.value)} />
                </Field>

                <Field tokens={tokens} label="Investmentoption / Risikoprofil">
                  <Select tokens={tokens} value={profileId} onChange={(e) => setProfileId(e.target.value as ProfileId)}>
                    {PROFILES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </Card>

            <Card tokens={tokens} title="Erweiterte Einstellungen" subtitle="Optional — klappt auf wie bei Scalable">
              <details open={expanded} onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)}>
                <summary style={summaryStyle(tokens)}>
                  {expanded ? "Ausblenden" : "Einblenden"}
                </summary>

                <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
                  <div style={grid2}>
                    <Field tokens={tokens} label="Erwartete Rendite p.a.">
                      <Input tokens={tokens} step="0.001" value={form.expectedReturnPa} onChange={(e) => setNum("expectedReturnPa", e.target.value)} />
                    </Field>

                    <Field tokens={tokens} label="Produktkosten p.a. (Effektivkosten)">
                      <Input tokens={tokens} step="0.001" value={form.totalFeePa} onChange={(e) => setNum("totalFeePa", e.target.value)} />
                    </Field>

                    <Field tokens={tokens} label="Grenzsteuersatz (Einzahlung)">
                      <Input tokens={tokens} step="0.01" value={form.marginalTaxRate} onChange={(e) => setNum("marginalTaxRate", e.target.value)} />
                    </Field>

                    <Field tokens={tokens} label="Steuersatz (Rente) — Depot">
                      <Input tokens={tokens} step="0.01" value={form.taxRateInRetirement} onChange={(e) => setNum("taxRateInRetirement", e.target.value)} />
                    </Field>
                  </div>

                  <Divider tokens={tokens} />

                  <div style={grid2}>
                    <Field tokens={tokens} label="Zulagen Stufe 1 (Rate / Cap €)">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <Input tokens={tokens} step="0.01" value={form.allowanceTier1Rate} onChange={(e) => setNum("allowanceTier1Rate", e.target.value)} />
                        <Input tokens={tokens} value={form.allowanceTier1Cap} onChange={(e) => setNum("allowanceTier1Cap", e.target.value)} />
                      </div>
                    </Field>

                    <Field tokens={tokens} label="Zulagen Stufe 2 (Rate / Cap €)">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <Input tokens={tokens} step="0.01" value={form.allowanceTier2Rate} onChange={(e) => setNum("allowanceTier2Rate", e.target.value)} />
                        <Input tokens={tokens} value={form.allowanceTier2Cap} onChange={(e) => setNum("allowanceTier2Cap", e.target.value)} />
                      </div>
                    </Field>

                    <Field tokens={tokens} label="Besteuerung Rentenphase (Depot)">
                      <Select tokens={tokens} value={taxationMode} onChange={(e) => setTaxationMode(e.target.value as TaxationMode)}>
                        <option value="tax_on_gains">nur Erträge besteuern</option>
                        <option value="fully_deferred">voll nachgelagert</option>
                      </Select>
                    </Field>

                    {taxationMode === "fully_deferred" && (
                      <Field tokens={tokens} label="Persönlicher Steuersatz (voll nachgelagert)">
                        <Input tokens={tokens} step="0.01" value={form.fullyDeferredTaxRate} onChange={(e) => setNum("fullyDeferredTaxRate", e.target.value)} />
                      </Field>
                    )}
                  </div>

                  {tab === "compare" && (
                    <>
                      <Divider tokens={tokens} />
                      <div style={grid2}>
                        <Field tokens={tokens} label="bAV-Modus">
                          <Select tokens={tokens} value={bavMode} onChange={(e) => setBavMode(e.target.value as BavInputMode)}>
                            <option value="simple">Simple (Netto → Brutto Faktor)</option>
                            <option value="detailed">Detailed</option>
                          </Select>
                        </Field>

                        <Field tokens={tokens} label="Arbeitgeberzuschuss">
                          <Input tokens={tokens} step="0.01" value={form.employerSubsidyRate} onChange={(e) => setNum("employerSubsidyRate", e.target.value)} />
                        </Field>

                        {bavMode === "simple" ? (
                          <Field tokens={tokens} label="Netto → Brutto Faktor">
                            <Input tokens={tokens} step="0.0001" value={form.netToGrossFactor} onChange={(e) => setNum("netToGrossFactor", e.target.value)} />
                          </Field>
                        ) : (
                          <Field tokens={tokens} label="Bruttoumwandlung €/Monat">
                            <Input tokens={tokens} value={form.grossConversion} onChange={(e) => setNum("grossConversion", e.target.value)} />
                          </Field>
                        )}

                        <Field tokens={tokens} label="Einkommensteuer in Rente (bAV)">
                          <Input tokens={tokens} step="0.01" value={form.incomeTaxRateRetirement} onChange={(e) => setNum("incomeTaxRateRetirement", e.target.value)} />
                        </Field>

                        <Field tokens={tokens} label="KV/PV in Rente (bAV)">
                          <Input tokens={tokens} step="0.01" value={form.kvPvRateRetirement} onChange={(e) => setNum("kvPvRateRetirement", e.target.value)} />
                        </Field>
                      </div>
                    </>
                  )}
                </div>
              </details>
            </Card>

            {!validation.success && (
              <Alert tokens={tokens} kind="danger">
                Eingaben ungültig: {validation.error.issues[0]?.message}
              </Alert>
            )}
            {warning && <Alert tokens={tokens} kind="warn">{warning}</Alert>}
          </div>

          {/* Right: Result panel */}
          <div style={{ display: "grid", gap: 14 }}>
            <Card tokens={tokens} title={tab === "compare" ? "Ergebnis: Depot vs bAV" : "Ergebnis: Altersvorsorgedepot"} subtitle="Klarer Überblick + kompakte Visualisierung">
              <div style={{ display: "grid", gap: 14 }}>
                {tab === "compare" ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <MetricRow tokens={tokens} label="Depot (Netto-Endkapital)" value={fmt(av.fvNet)} />
                    <MetricRow tokens={tokens} label="bAV (Netto-Endkapital)" value={fmt(bav.fvNet)} />
                    <div style={{ marginTop: 6 }}>
                      <DeltaBadge tokens={tokens} winner={comparison.winner} delta={comparison.deltaNet} fmt={fmt} />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    <MetricRow tokens={tokens} label="Netto-Endkapital" value={fmt(av.fvNet)} />
                    <MetricRow tokens={tokens} label="Brutto-Endkapital" value={fmt(av.fvGross)} />
                    <MetricRow tokens={tokens} label="Förderung (Zulagen + Steuervorteil)" value={fmt(avFunding)} />
                  </div>
                )}

                {/* Chart */}
                <div style={{ padding: 14, borderRadius: 16, border: `1px solid ${tokens.border}`, background: tokens.panel2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
                    <div style={{ fontWeight: 800, letterSpacing: -0.2 }}>Visualisierung</div>
                    <div style={{ color: tokens.muted, fontSize: 13 }}>
                      {tab === "compare" ? "Netto-Endkapital Vergleich" : "Förderung & Wachstum (vereinfacht)"}
                    </div>
                  </div>

                  {props.showChart !== false && (
                    <CompareBars
                      tokens={tokens}
                      avNet={av.fvNet}
                      bavNet={bav.fvNet}
                      compare={tab === "compare"}
                      funding={avFunding}
                    />
                  )}
                </div>

                {/* Details accordion */}
                <details open={detailsOpen} onToggle={(e) => setDetailsOpen((e.target as HTMLDetailsElement).open)}>
                  <summary style={summaryStyle(tokens)}>Berechnungsdetails</summary>

                  <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                    <MiniTable
                      tokens={tokens}
                      title="Altersvorsorgedepot"
                      rows={[
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
                      <MiniTable
                        tokens={tokens}
                        title="DYNO bAV"
                        rows={[
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
                </details>
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom spacing */}
        <div style={{ height: 24 }} />
      </div>
    </div>
  )
}

/* ----------------------------- UI building blocks ----------------------------- */

function Card({
  tokens,
  title,
  subtitle,
  children,
}: {
  tokens: typeof TOKENS
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: tokens.panel,
        borderRadius: tokens.radius,
        border: `1px solid ${tokens.border}`,
        boxShadow: tokens.shadow,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "baseline", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 850, letterSpacing: -0.2, fontSize: 16 }}>{title}</div>
          {subtitle && <div style={{ color: tokens.muted, fontSize: 13, marginTop: 4 }}>{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}

function Pill({
  tokens,
  active,
  onClick,
  children,
}: {
  tokens: typeof TOKENS
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${active ? "transparent" : tokens.border2}`,
        background: active ? tokens.primary : "transparent",
        color: active ? "#fff" : tokens.text,
        padding: "10px 14px",
        borderRadius: 999,
        fontWeight: 750,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  )
}

function Field({
  tokens,
  label,
  help,
  children,
}: {
  tokens: typeof TOKENS
  label: string
  help?: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 750 }}>{label}</span>
        {help && <span style={{ color: tokens.muted, fontSize: 12 }}>ⓘ {help}</span>}
      </div>
      {children}
    </label>
  )
}

function Input(props: {
  tokens: typeof TOKENS
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  step?: string
}) {
  const { tokens, step } = props
  return (
    <input
      type="number"
      step={step ?? "1"}
      value={Number.isFinite(props.value) ? props.value : 0}
      onChange={props.onChange}
      style={inputStyle(tokens)}
    />
  )
}

function Select(props: {
  tokens: typeof TOKENS
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  children: React.ReactNode
}) {
  const { tokens } = props
  return (
    <select value={props.value} onChange={props.onChange} style={inputStyle(tokens)}>
      {props.children}
    </select>
  )
}

function Alert({ tokens, kind, children }: { tokens: typeof TOKENS; kind: "danger" | "warn"; children: React.ReactNode }) {
  const color = kind === "danger" ? tokens.danger : tokens.warn
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${color}55`,
        color: tokens.text,
        borderRadius: 16,
        padding: "10px 12px",
      }}
    >
      <span style={{ color, fontWeight: 800 }}>{kind === "danger" ? "Fehler: " : "Hinweis: "}</span>
      {children}
    </div>
  )
}

function MetricRow({ tokens, label, value }: { tokens: typeof TOKENS; label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
      <div style={{ color: tokens.muted }}>{label}</div>
      <div style={{ fontWeight: 900, fontSize: 18 }}>{value}</div>
    </div>
  )
}

function DeltaBadge({
  tokens,
  winner,
  delta,
  fmt,
}: {
  tokens: typeof TOKENS
  winner: "depot" | "bav" | "equal"
  delta: number
  fmt: (v: number) => string
}) {
  const isEqual = winner === "equal" || Math.abs(delta) < 0.5
  const isBav = winner === "bav"
  const label = isEqual ? "Gleichstand" : isBav ? `bAV +${fmt(delta)}` : `Depot +${fmt(Math.abs(delta))}`
  const color = isEqual ? TOKENS.muted : isBav ? TOKENS.accent : TOKENS.warn

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 999,
        border: `1px solid ${TOKENS.border2}`,
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 99, background: color }} />
      <span style={{ fontWeight: 900 }}>{label}</span>
    </div>
  )
}

function MiniTable({ tokens, title, rows }: { tokens: typeof TOKENS; title: string; rows: [string, string][] }) {
  return (
    <div style={{ border: `1px solid ${tokens.border}`, background: tokens.panel2, borderRadius: 16, padding: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: tokens.muted }}>{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function Divider({ tokens }: { tokens: typeof TOKENS }) {
  return <div style={{ height: 1, background: tokens.border, margin: "2px 0" }} />
}

/* ----------------------------- Chart (Scalable-like) ----------------------------- */

function CompareBars({
  tokens,
  avNet,
  bavNet,
  compare,
  funding,
}: {
  tokens: typeof TOKENS
  avNet: number
  bavNet: number
  compare: boolean
  funding: number
}) {
  const max = Math.max(1, avNet, bavNet)
  const avH = Math.round((avNet / max) * 90)
  const bavH = Math.round((bavNet / max) * 90)

  // mini “growth line”
  const lineY2 = compare ? 100 - Math.round((bavNet / max) * 80) : 40

  return (
    <svg viewBox="0 0 360 160" width="100%" height="160" role="img" aria-label="Vergleich">
      <rect x="0" y="0" width="360" height="160" rx="14" fill="rgba(255,255,255,0.03)" />

      {/* baseline */}
      <line x1="30" y1="132" x2="330" y2="132" stroke="rgba(255,255,255,0.10)" />

      {/* Bars */}
      <rect x="70" y={132 - avH} width="60" height={avH} rx="10" fill={tokens.primary} opacity="0.95" />
      {compare ? (
        <rect x="160" y={132 - bavH} width="60" height={bavH} rx="10" fill={tokens.accent} opacity="0.95" />
      ) : (
        <rect x="160" y={132 - Math.min(90, Math.round((funding / Math.max(1, avNet)) * 120))} width="60" height={Math.min(90, Math.round((funding / Math.max(1, avNet)) * 120))} rx="10" fill={tokens.accent} opacity="0.85" />
      )}

      {/* Labels */}
      <text x="100" y="150" textAnchor="middle" fill={tokens.muted} fontSize="11">
        Depot
      </text>
      <text x="190" y="150" textAnchor="middle" fill={tokens.muted} fontSize="11">
        {compare ? "bAV" : "Förderung"}
      </text>

      {/* Values */}
      <text x="100" y={132 - avH - 8} textAnchor="middle" fill={tokens.text} fontSize="12" fontWeight="700">
        {formatCompactEUR(avNet)}
      </text>
      <text x="190" y={132 - (compare ? bavH : Math.min(90, Math.round((funding / Math.max(1, avNet)) * 120))) - 8} textAnchor="middle" fill={tokens.text} fontSize="12" fontWeight="700">
        {compare ? formatCompactEUR(bavNet) : formatCompactEUR(funding)}
      </text>

      {/* subtle line */}
      <line x1="30" y1="120" x2="330" y2={lineY2} stroke="rgba(255,255,255,0.10)" strokeWidth="2" />
    </svg>
  )
}

function formatCompactEUR(v: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v)
}

/* ----------------------------- Styles ----------------------------- */

const gridMain: React.CSSProperties = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "1.25fr 0.85fr",
}

const grid2: React.CSSProperties = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
}

function inputStyle(tokens: typeof TOKENS): React.CSSProperties {
  return {
    width: "100%",
    height: 46,
    borderRadius: 14,
    border: `1px solid ${tokens.border2}`,
    background: "rgba(255,255,255,0.03)",
    color: tokens.text,                 // <- fixes “white on white / invisible”
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  }
}

function summaryStyle(tokens: typeof TOKENS): React.CSSProperties {
  return {
    cursor: "pointer",
    userSelect: "none",
    listStyle: "none",
    fontWeight: 850,
    padding: "10px 0",
    color: tokens.text,
  }
}

/**
 * Mobile: stack columns
 */
if (typeof window !== "undefined") {
  // no-op, but keeps TS happy in some setups
}
