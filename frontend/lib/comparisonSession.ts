import {
  buildVariantFromInsight,
  type ChangedField,
  type RecommendationType,
  type StructuredRecommendation,
  type ArnabelaInsight,
} from "./arnabelaInsight";
import { customerIdsFromSimulation } from "./comparison";
import type {
  ComparisonSession,
  ComparisonVariantDraft,
  StoredSimulation,
} from "./simulationClient";

export function createComparisonSession(
  simulation: StoredSimulation,
  insight: ArnabelaInsight,
): ComparisonSession {
  const preview = buildVariantFromInsight(
    {
      productName: simulation.productName,
      testType: simulation.testType,
      description: simulation.description,
      price: simulation.price,
      targetMarket: simulation.targetMarket,
      keyFeatures: simulation.keyFeatures ?? [],
    },
    insight,
    { parentTestId: simulation.testId },
  );

  const recommendation = preview.recommendation;

  const variantDraft: ComparisonVariantDraft = {
    productName: preview.variant.productName,
    testType: preview.variant.testType,
    description: preview.variant.description,
    price: preview.variant.price,
    targetMarket: preview.variant.targetMarket,
    keyFeatures: preview.variant.keyFeatures,
    insightHeadline: insight.headline,
    nextExperiment: recommendation.nextExperiment,
    nextExperimentKind: recommendation.legacyKind,
    label: recommendation.title,
    recommendationType: recommendation.type,
    recommendationTitle: recommendation.title,
    recommendationReason: recommendation.reason,
    canApply: recommendation.canApply,
    applyBlockReason: recommendation.applyBlockReason,
    changedFields: preview.changedFields,
    parentTestId: simulation.testId,
    changeSummary: preview.changeSummary,
  };

  return {
    baseline: simulation,
    customerIds: customerIdsFromSimulation(simulation),
    variantDraft,
    variant: null,
    variantJobId: null,
  };
}

export type {
  ChangedField,
  RecommendationType,
  StructuredRecommendation,
};
