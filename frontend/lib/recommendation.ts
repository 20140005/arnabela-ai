/**
 * Re-export recommendation / variant builders from the Insight module.
 * Kept as a stable import path for UI code.
 */
export {
  buildStructuredRecommendation,
  buildVariantFromInsight,
  buildVariantPreview,
  containsFabricatedClaimLanguage,
  lowerPriceDeterministic,
  recommendationTitle,
  recommendationTypeFromLegacyKind,
  resolveRecommendationType,
  scoreRecommendationCandidates,
  selectRecommendation,
  type ChangedField,
  type RecommendationEvidence,
  type RecommendationType,
  type StructuredRecommendation,
  type VariantPreview,
} from "./arnabelaInsight.ts";
