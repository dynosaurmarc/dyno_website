export type TaxationMode = "tax_on_gains" | "fully_deferred"

export interface AllowanceTier {
  rate: number
  cap: number
}

export interface AvDepotInput {
  monthlyNetOutlay: number
  years: number
  expectedReturnPa: number
  totalFeePa: number
  marginalTaxRate: number
  taxRateInRetirement: number
  taxationMode: TaxationMode
  fullyDeferredTaxRate?: number
  allowanceTiers?: [AllowanceTier, AllowanceTier]
}

export interface AvDepotResult {
  monthlyContribution: number
  annualOwn: number
  annualAllowance: number
  annualAllowanceTier1: number
  annualAllowanceTier2: number
  annualTaxAdvantage: number
  annualReinvestedTaxBenefit: number
  annualTotalInvested: number
  totalOwnPaid: number
  totalAllowancePaid: number
  totalTaxReinvestedPaid: number
  totalInvested: number
  fvGross: number
  gains: number
  taxAtPayout: number
  fvNet: number
  totalEarnings: number
}

export function accumulateMonthly(monthlyContribution: number, years: number, monthlyRate: number): number {
  const months = years * 12
  let fv = 0
  for (let i = 0; i < months; i += 1) {
    fv = (fv + monthlyContribution) * (1 + monthlyRate)
  }
  return fv
}

export function calculateAvDepot(input: AvDepotInput): AvDepotResult {
  const tiers: [AllowanceTier, AllowanceTier] = input.allowanceTiers ?? [
    { rate: 0.3, cap: 1200 },
    { rate: 0.2, cap: 600 },
  ]

  const annualOwn = input.monthlyNetOutlay * 12
  const tier1Base = Math.min(annualOwn, tiers[0].cap)
  const tier2Base = Math.min(Math.max(annualOwn - tiers[0].cap, 0), tiers[1].cap)

  const annualAllowanceTier1 = tier1Base * tiers[0].rate
  const annualAllowanceTier2 = tier2Base * tiers[1].rate
  const annualAllowance = annualAllowanceTier1 + annualAllowanceTier2

  const annualTaxAdvantage = annualOwn * input.marginalTaxRate
  const annualReinvestedTaxBenefit = Math.max(annualTaxAdvantage - annualAllowance, 0)
  const annualTotalInvested = annualOwn + annualAllowance + annualReinvestedTaxBenefit

  const monthlyContribution = annualTotalInvested / 12
  const monthlyRate = (input.expectedReturnPa - input.totalFeePa) / 12
  const fvGross = accumulateMonthly(monthlyContribution, input.years, monthlyRate)

  const totalOwnPaid = annualOwn * input.years
  const totalAllowancePaid = annualAllowance * input.years
  const totalTaxReinvestedPaid = annualReinvestedTaxBenefit * input.years
  const totalInvested = annualTotalInvested * input.years
  const gains = fvGross - totalOwnPaid

  const taxAtPayout =
    input.taxationMode === "fully_deferred"
      ? fvGross * (input.fullyDeferredTaxRate ?? input.taxRateInRetirement)
      : Math.max(gains, 0) * input.taxRateInRetirement

  const fvNet = fvGross - taxAtPayout
  const totalEarnings = fvGross - totalInvested

  return {
    monthlyContribution,
    annualOwn,
    annualAllowance,
    annualAllowanceTier1,
    annualAllowanceTier2,
    annualTaxAdvantage,
    annualReinvestedTaxBenefit,
    annualTotalInvested,
    totalOwnPaid,
    totalAllowancePaid,
    totalTaxReinvestedPaid,
    totalInvested,
    fvGross,
    gains,
    taxAtPayout,
    fvNet,
    totalEarnings,
  }
}
