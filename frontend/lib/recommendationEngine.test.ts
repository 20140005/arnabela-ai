import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MIN_RECOMMENDATION_SCORE,
  scoreRecommendationCandidates,
  selectRecommendation,
  type RecommendationEngineInput,
} from "./recommendationEngine.ts";

function base(
  overrides?: Partial<RecommendationEngineInput>,
): RecommendationEngineInput {
  return {
    respondingCustomers: 100,
    overallPurchaseIntent: 5.5,
    wouldBuyPercentage: 35,
    wouldConsiderPercentage: 25,
    rejectedPercentage: 40,
    averageInterest: 6.5,
    averageUnderstanding: 6.5,
    averageTrust: 6.5,
    averagePriceAcceptance: 6,
    positiveDrivers: [],
    negativeDrivers: [],
    archetypes: [],
    product: null,
    ...overrides,
  };
}

describe("recommendationEngine", () => {
  it("is deterministic for the same input", () => {
    const input = base({
      averagePriceAcceptance: 3.5,
      averageInterest: 7.5,
      overallPurchaseIntent: 5,
      negativeDrivers: [
        { label: "Price feels too high", count: 55, percentage: 55 },
      ],
      archetypes: [
        {
          name: "Budget-Focused Buyer",
          customers: 14,
          purchaseIntent: 2.5,
        },
      ],
    });

    const first = selectRecommendation(input);
    const second = selectRecommendation(input);
    assert.deepEqual(first, second);
    assert.equal(first.type, "LOWER_PRICE");
  });

  it("recommends LOWER_PRICE under strong price pressure", () => {
    const result = selectRecommendation(
      base({
        averagePriceAcceptance: 3.2,
        averageInterest: 7.8,
        overallPurchaseIntent: 5.1,
        averageTrust: 7.5,
        negativeDrivers: [
          { label: "Price feels too high", count: 60, percentage: 60 },
          { label: "Need proof it actually works", count: 20, percentage: 20 },
        ],
        archetypes: [
          {
            name: "Budget-Focused Buyer",
            customers: 20,
            purchaseIntent: 1.8,
          },
        ],
      }),
    );

    assert.equal(result.type, "LOWER_PRICE");
    assert.ok(result.score >= MIN_RECOMMENDATION_SCORE);
    assert.match(result.title, /lower price/i);
    assert.ok(
      result.evidence.some((item) => item.metric === "price_acceptance"),
    );
  });

  it("does not recommend STRONGER_PROOF when trust is already strong", () => {
    const result = selectRecommendation(
      base({
        averageTrust: 8.5,
        overallPurchaseIntent: 8.8,
        averagePriceAcceptance: 4,
        averageInterest: 8.5,
        negativeDrivers: [
          { label: "Price feels too high", count: 50, percentage: 50 },
          { label: "Need proof it actually works", count: 35, percentage: 35 },
        ],
      }),
    );

    assert.notEqual(result.type, "STRONGER_PROOF");
    assert.equal(result.type, "LOWER_PRICE");
  });

  it("recommends STRONGER_PROOF when trust/proof gap is real", () => {
    const result = selectRecommendation(
      base({
        averageTrust: 3.8,
        averageUnderstanding: 7,
        averageInterest: 7.2,
        overallPurchaseIntent: 4.8,
        averagePriceAcceptance: 7,
        negativeDrivers: [
          {
            label: "Need proof it actually works",
            count: 48,
            percentage: 48,
          },
        ],
      }),
    );

    assert.equal(result.type, "STRONGER_PROOF");
  });

  it("recommends CLARIFY_BENEFITS when understanding lags", () => {
    const result = selectRecommendation(
      base({
        averageUnderstanding: 3.5,
        averageInterest: 7,
        averageTrust: 6.5,
        averagePriceAcceptance: 6.5,
        overallPurchaseIntent: 4.5,
        negativeDrivers: [
          { label: "Needs more information", count: 45, percentage: 45 },
        ],
      }),
    );

    assert.equal(result.type, "CLARIFY_BENEFITS");
  });

  it("recommends STRENGTHEN_DIFFERENTIATION under comparison pressure", () => {
    const result = selectRecommendation(
      base({
        averageUnderstanding: 7.5,
        averageTrust: 7.2,
        averagePriceAcceptance: 6.8,
        overallPurchaseIntent: 5.2,
        negativeDrivers: [
          {
            label: "Would compare alternatives",
            count: 52,
            percentage: 52,
          },
        ],
      }),
    );

    assert.equal(result.type, "STRENGTHEN_DIFFERENTIATION");
  });

  it("recommends EMPHASISE_CONVENIENCE when convenience pull mismatches tech framing", () => {
    const result = selectRecommendation(
      base({
        averageTrust: 7,
        averagePriceAcceptance: 6.5,
        averageUnderstanding: 7,
        overallPurchaseIntent: 6,
        positiveDrivers: [
          {
            label: "Saves time / convenience",
            count: 40,
            percentage: 40,
          },
        ],
        negativeDrivers: [
          { label: "Would compare alternatives", count: 12, percentage: 12 },
        ],
        archetypes: [
          {
            name: "Convenience-First Buyer",
            customers: 12,
            purchaseIntent: 8.2,
          },
        ],
        product: {
          productName: "FreshMind Smart Fridge",
          description:
            "An AI-powered refrigerator with built-in cameras and advanced recognition technology.",
          price: 2499,
          targetMarket: "Busy professionals and Australian households",
          keyFeatures: ["AI recognition", "Smart shopping lists"],
        },
      }),
    );

    assert.equal(result.type, "EMPHASISE_CONVENIENCE");
  });

  it("recommends EMPHASISE_SUSTAINABILITY when waste signals are strong", () => {
    const result = selectRecommendation(
      base({
        averageTrust: 7,
        averagePriceAcceptance: 6.5,
        averageUnderstanding: 7,
        overallPurchaseIntent: 5.8,
        positiveDrivers: [
          {
            label: "Helps reduce food waste",
            count: 44,
            percentage: 44,
          },
        ],
        archetypes: [
          {
            name: "Sustainability-Focused Buyer",
            customers: 15,
            purchaseIntent: 8.4,
          },
        ],
        product: {
          productName: "FreshMind",
          description: "Helps households reduce food waste with expiry tracking.",
          price: 2499,
          targetMarket: "Australian households",
          keyFeatures: ["Food-waste monitoring"],
        },
      }),
    );

    assert.equal(result.type, "EMPHASISE_SUSTAINABILITY");
  });

  it("recommends a segment lean-in when one archetype dominates", () => {
    const result = selectRecommendation(
      base({
        overallPurchaseIntent: 5.2,
        averageTrust: 7,
        averagePriceAcceptance: 6.5,
        averageUnderstanding: 7,
        positiveDrivers: [
          {
            label: "Strong fit with digital behaviour",
            count: 30,
            percentage: 30,
          },
        ],
        negativeDrivers: [
          { label: "Needs more information", count: 10, percentage: 10 },
        ],
        archetypes: [
          {
            name: "Tech Enthusiast",
            customers: 12,
            purchaseIntent: 9.6,
          },
          {
            name: "Budget-Focused Buyer",
            customers: 14,
            purchaseIntent: 1.4,
          },
        ],
      }),
    );

    assert.equal(result.type, "LEAN_INTO_SEGMENT");
    assert.match(result.title, /Tech Enthusiast/i);
  });

  it("returns NO_CLEAR_VARIANT when signals are weak", () => {
    const result = selectRecommendation(
      base({
        overallPurchaseIntent: 6.5,
        averageInterest: 6.6,
        averageTrust: 6.7,
        averageUnderstanding: 6.8,
        averagePriceAcceptance: 6.6,
        positiveDrivers: [
          { label: "Relevant", count: 12, percentage: 12 },
        ],
        negativeDrivers: [
          { label: "Not for me", count: 11, percentage: 11 },
        ],
      }),
    );

    assert.equal(result.type, "NO_CLEAR_VARIANT");
  });

  it("ranks multiple candidates without randomness", () => {
    const ranked = scoreRecommendationCandidates(
      base({
        averagePriceAcceptance: 3.5,
        averageTrust: 3.5,
        negativeDrivers: [
          { label: "Price feels too high", count: 40, percentage: 40 },
          {
            label: "Need proof it actually works",
            count: 40,
            percentage: 40,
          },
        ],
      }),
    );

    assert.ok(ranked.length > 3);
    assert.deepEqual(
      ranked[0],
      selectRecommendation(
        base({
          averagePriceAcceptance: 3.5,
          averageTrust: 3.5,
          negativeDrivers: [
            { label: "Price feels too high", count: 40, percentage: 40 },
            {
              label: "Need proof it actually works",
              count: 40,
              percentage: 40,
            },
          ],
        }),
      ),
    );
  });
});
