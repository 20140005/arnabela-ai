import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildArnabelaInsight,
  buildNextTestDraft,
  buildVariantFromInsight,
  containsFabricatedClaimLanguage,
  lowerPriceDeterministic,
  selectRecommendation,
  type InsightInput,
} from "./arnabelaInsight.ts";

function baseInput(
  overrides?: Partial<InsightInput>,
): InsightInput {
  return {
    respondingCustomers: 100,
    overallPurchaseIntent: 6.3,
    wouldBuyPercentage: 40,
    wouldConsiderPercentage: 30,
    rejectedPercentage: 30,
    averageInterest: 6.5,
    averageUnderstanding: 7,
    averageTrust: 6.2,
    averagePriceAcceptance: 5.5,
    positiveDrivers: [
      {
        label: "Saves administrative time",
        count: 40,
        percentage: 40,
      },
    ],
    negativeDrivers: [
      {
        label: "Needs more information",
        count: 25,
        percentage: 25,
      },
    ],
    topArchetype: {
      name: "Tech Enthusiast",
      customers: 10,
      purchaseIntent: 8.1,
    },
    archetypes: [
      {
        name: "Tech Enthusiast",
        customers: 10,
        purchaseIntent: 8.1,
      },
    ],
    product: null,
    ...overrides,
  };
}

const freshMind = {
  productName: "FreshMind Smart Fridge",
  testType: "Product",
  description:
    "A smart refrigerator that uses built-in cameras and AI to track the food inside the fridge. It identifies products, monitors expiry dates, suggests meals based on available ingredients, creates shopping lists, and sends alerts when food is running low or about to expire. It also helps households reduce food waste and recommends cheaper alternatives when shopping.",
  price: 2499,
  targetMarket:
    "Australian households, especially busy professionals, families and technology-conscious consumers aged 25–55.",
  keyFeatures: [
    "AI-powered food recognition",
    "Automatic expiry-date tracking",
    "Smart shopping lists",
    "Recipe suggestions based on available ingredients",
    "Food-waste monitoring",
  ],
};

describe("multi-signal insight recommendations", () => {
  it("attaches evidence and a specific title", () => {
    const insight = buildArnabelaInsight(
      baseInput({
        averagePriceAcceptance: 3.4,
        averageInterest: 7.5,
        overallPurchaseIntent: 5,
        averageTrust: 7.2,
        negativeDrivers: [
          {
            label: "Price feels too high",
            count: 50,
            percentage: 50,
          },
        ],
        archetypes: [
          {
            name: "Budget-Focused Buyer",
            customers: 14,
            purchaseIntent: 2,
          },
        ],
      }),
    );

    assert.equal(insight.recommendation.type, "LOWER_PRICE");
    assert.match(insight.recommendation.title, /lower price/i);
    assert.ok(insight.recommendation.evidence.length > 0);
    assert.ok(insight.recommendation.rationale.length > 20);
  });

  it("does not default to stronger proof when trust is high and price is weak", () => {
    const insight = buildArnabelaInsight(
      baseInput({
        averageTrust: 8.5,
        overallPurchaseIntent: 8.8,
        averagePriceAcceptance: 3.8,
        negativeDrivers: [
          {
            label: "Price feels too high",
            count: 40,
            percentage: 40,
          },
          {
            label: "Need proof it actually works",
            count: 35,
            percentage: 35,
          },
        ],
      }),
    );

    assert.notEqual(insight.recommendation.type, "STRONGER_PROOF");
    assert.equal(insight.recommendation.type, "LOWER_PRICE");
  });

  it("creates materially different Version 2 fields by recommendation type", () => {
    const priceInsight = buildArnabelaInsight(
      baseInput({
        averagePriceAcceptance: 3.2,
        averageInterest: 7.8,
        overallPurchaseIntent: 5,
        averageTrust: 7.5,
        negativeDrivers: [
          {
            label: "Price feels too high",
            count: 55,
            percentage: 55,
          },
        ],
      }),
    );

    const proofInsight = buildArnabelaInsight(
      baseInput({
        averageTrust: 3.5,
        averagePriceAcceptance: 7,
        averageInterest: 7,
        overallPurchaseIntent: 4.5,
        negativeDrivers: [
          {
            label: "Need proof it actually works",
            count: 50,
            percentage: 50,
          },
        ],
      }),
    );

    const pricePreview = buildVariantFromInsight(freshMind, priceInsight, {
      parentTestId: "v1",
    });
    const proofPreview = buildVariantFromInsight(freshMind, proofInsight, {
      parentTestId: "v1",
    });

    assert.equal(pricePreview.parentTestId, "v1");
    assert.deepEqual(pricePreview.changedFields, ["price"]);
    assert.equal(pricePreview.variant.price, lowerPriceDeterministic(2499));
    assert.equal(pricePreview.original.price, 2499);

    assert.deepEqual(proofPreview.changedFields, ["description"]);
    assert.equal(proofPreview.variant.price, 2499);
    assert.notEqual(
      proofPreview.variant.description,
      freshMind.description,
    );
    assert.equal(
      containsFabricatedClaimLanguage(proofPreview.variant.description),
      false,
    );
  });

  it("keeps same recommendation for identical simulation evidence", () => {
    const input = baseInput({
      averageTrust: 3.8,
      averagePriceAcceptance: 7,
      negativeDrivers: [
        {
          label: "Need proof it actually works",
          count: 48,
          percentage: 48,
        },
      ],
    });

    const a = buildArnabelaInsight(input);
    const b = buildArnabelaInsight(input);
    assert.deepEqual(a.recommendation, b.recommendation);
  });
});

describe("buildNextTestDraft via recommendation builder", () => {
  it("does not invent guarantee features for proof recommendations", () => {
    const insight = buildArnabelaInsight(
      baseInput({
        overallPurchaseIntent: 5.4,
        averageTrust: 3.8,
        averagePriceAcceptance: 7,
        negativeDrivers: [
          {
            label: "Need proof it actually works",
            count: 40,
            percentage: 40,
          },
        ],
      }),
    );

    const draft = buildNextTestDraft(
      {
        productName: "Field Assistant",
        testType: "Product",
        description: "An AI assistant for trades.",
        price: 199,
        targetMarket: "Australian tradespeople",
        keyFeatures: ["Voice notes"],
      },
      insight,
    );

    assert.equal(draft.price, 199);
    assert.deepEqual(draft.keyFeatures, ["Voice notes"]);
    assert.equal(containsFabricatedClaimLanguage(draft.description), false);
  });

  it("prepopulates a deterministic lower price", () => {
    const insight = buildArnabelaInsight(
      baseInput({
        overallPurchaseIntent: 7.2,
        averagePriceAcceptance: 3.2,
        averageTrust: 7,
        averageInterest: 7.8,
        negativeDrivers: [
          {
            label: "Price feels too high",
            count: 50,
            percentage: 50,
          },
        ],
        archetypes: [
          {
            name: "Budget-Focused Buyer",
            customers: 20,
            purchaseIntent: 2,
          },
        ],
      }),
    );

    const draft = buildNextTestDraft(freshMind, insight);

    assert.equal(insight.recommendation.type, "LOWER_PRICE");
    assert.equal(draft.price, 2199);
    assert.equal(draft.description, freshMind.description);
  });
});

describe("selectRecommendation integration", () => {
  it("exposes the same winner as buildArnabelaInsight", () => {
    const input = baseInput({
      averageUnderstanding: 3.2,
      averageInterest: 7,
      averageTrust: 6.5,
      averagePriceAcceptance: 6.5,
      negativeDrivers: [
        {
          label: "Needs more information",
          count: 50,
          percentage: 50,
        },
      ],
    });

    const insight = buildArnabelaInsight(input);
    const selected = selectRecommendation({
      respondingCustomers: input.respondingCustomers,
      overallPurchaseIntent: input.overallPurchaseIntent,
      wouldBuyPercentage: input.wouldBuyPercentage,
      wouldConsiderPercentage: input.wouldConsiderPercentage,
      rejectedPercentage: input.rejectedPercentage,
      averageInterest: input.averageInterest,
      averageUnderstanding: input.averageUnderstanding,
      averageTrust: input.averageTrust,
      averagePriceAcceptance: input.averagePriceAcceptance,
      positiveDrivers: input.positiveDrivers,
      negativeDrivers: input.negativeDrivers,
      archetypes: input.archetypes ?? [],
      product: null,
    });

    assert.equal(insight.recommendation.type, selected.type);
  });
});
