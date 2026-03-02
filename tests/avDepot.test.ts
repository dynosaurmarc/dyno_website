import { describe, expect, it } from "vitest"
import { calculateAvDepot } from "../lib/calc/avDepot"

describe("calculateAvDepot", () => {
  it("calculates deterministic baseline with defaults", () => {
    const result = calculateAvDepot({
      monthlyNetOutlay: 65,
      years: 30,
      expectedReturnPa: 0.055,
      totalFeePa: 0.0135,
      marginalTaxRate: 0.42,
      taxRateInRetirement: 0.25,
      taxationMode: "tax_on_gains",
    })

    expect(result.annualAllowance).toBe(234)
    expect(result.annualReinvestedTaxBenefit).toBeCloseTo(93.6, 6)
    expect(result.monthlyContribution).toBeCloseTo(92.3, 6)
    expect(result.fvGross).toBeGreaterThan(60000)
    expect(result.fvNet).toBeLessThan(result.fvGross)
  })

  it("does not tax negative gains in tax_on_gains mode", () => {
    const result = calculateAvDepot({
      monthlyNetOutlay: 100,
      years: 1,
      expectedReturnPa: 0,
      totalFeePa: 0.1,
      marginalTaxRate: 0,
      taxRateInRetirement: 0.25,
      taxationMode: "tax_on_gains",
    })

    expect(result.gains).toBeLessThan(0)
    expect(result.taxAtPayout).toBe(0)
  })
})
