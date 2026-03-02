import { describe, expect, it } from "vitest"
import { calculateBav } from "../lib/calc/bav"

describe("calculateBav", () => {
  it("supports simple mode default conversion", () => {
    const result = calculateBav({
      mode: "simple",
      monthlyNetOutlay: 65,
      years: 30,
      expectedReturnPa: 0.055,
      totalFeePa: 0.0135,
      employerSubsidyRate: 0.15,
      netToGrossFactor: 2.0077,
      incomeTaxRateRetirement: 0.2,
      kvPvRateRetirement: 0.2,
    })

    expect(result.grossConversion).toBeCloseTo(130.5005, 4)
    expect(result.employerTopup).toBeCloseTo(19.575075, 4)
    expect(result.totalInvestedMonth).toBeCloseTo(150.075575, 4)
    expect(result.fvNet).toBeCloseTo(result.fvGross * 0.6, 6)
  })
})
