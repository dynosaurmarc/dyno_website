import { describe, expect, it } from "vitest"
import { compareScenarios } from "../lib/calc/compare"

describe("compareScenarios", () => {
  it("returns winner and delta", () => {
    const result = compareScenarios(
      {
        monthlyNetOutlay: 65,
        years: 30,
        expectedReturnPa: 0.055,
        totalFeePa: 0.0135,
        marginalTaxRate: 0.42,
        taxRateInRetirement: 0.25,
        taxationMode: "tax_on_gains",
      },
      {
        mode: "simple",
        monthlyNetOutlay: 65,
        years: 30,
        expectedReturnPa: 0.055,
        totalFeePa: 0.0135,
        employerSubsidyRate: 0.15,
        netToGrossFactor: 2.0077,
        incomeTaxRateRetirement: 0.2,
        kvPvRateRetirement: 0.2,
      },
    )

    expect(result.winner).toBe("bav")
    expect(result.deltaNet).toBeGreaterThan(0)
  })
})
