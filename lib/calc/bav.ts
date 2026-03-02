import { accumulateMonthly } from "./avDepot"

export type BavInputMode = "simple" | "detailed"

export interface BavInput {
  mode: BavInputMode
  monthlyNetOutlay: number
  years: number
  expectedReturnPa: number
  totalFeePa: number
  employerSubsidyRate: number
  netToGrossFactor: number
  grossConversion?: number
  incomeTaxRateRetirement: number
  kvPvRateRetirement: number
}

export interface BavResult {
  grossConversion: number
  employerTopup: number
  totalInvestedMonth: number
  totalOwnPaid: number
  totalEmployerPaid: number
  totalInvested: number
  fvGross: number
  incomeTax: number
  healthCare: number
  totalDeductions: number
  fvNet: number
  totalEarnings: number
}

export function calculateBav(input: BavInput): BavResult {
  const grossConversion = input.mode === "detailed" ? input.grossConversion ?? 0 : input.monthlyNetOutlay * input.netToGrossFactor
  const employerTopup = grossConversion * input.employerSubsidyRate
  const totalInvestedMonth = grossConversion + employerTopup

  const monthlyRate = (input.expectedReturnPa - input.totalFeePa) / 12
  const fvGross = accumulateMonthly(totalInvestedMonth, input.years, monthlyRate)

  const totalOwnPaid = input.monthlyNetOutlay * 12 * input.years
  const totalEmployerPaid = employerTopup * 12 * input.years
  const totalInvested = totalInvestedMonth * 12 * input.years

  const incomeTax = fvGross * input.incomeTaxRateRetirement
  const healthCare = fvGross * input.kvPvRateRetirement
  const totalDeductions = incomeTax + healthCare
  const fvNet = fvGross - totalDeductions
  const totalEarnings = fvGross - totalInvested

  return {
    grossConversion,
    employerTopup,
    totalInvestedMonth,
    totalOwnPaid,
    totalEmployerPaid,
    totalInvested,
    fvGross,
    incomeTax,
    healthCare,
    totalDeductions,
    fvNet,
    totalEarnings,
  }
}
