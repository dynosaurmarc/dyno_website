import { calculateAvDepot, type AvDepotInput, type AvDepotResult } from "./avDepot"
import { calculateBav, type BavInput, type BavResult } from "./bav"

export interface ComparisonResult {
  avDepot: AvDepotResult
  bav: BavResult
  deltaNet: number
  winner: "bav" | "depot" | "equal"
}

export function compareScenarios(avInput: AvDepotInput, bavInput: BavInput): ComparisonResult {
  const avDepot = calculateAvDepot(avInput)
  const bav = calculateBav(bavInput)
  const deltaNet = bav.fvNet - avDepot.fvNet

  return {
    avDepot,
    bav,
    deltaNet,
    winner: deltaNet > 0 ? "bav" : deltaNet < 0 ? "depot" : "equal",
  }
}
