import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildArnabelaInsight,
  buildNextTestDraft,
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
    ...overrides,
  };
}

describe("buildArnabelaInsight", () => {
  it("handles no responding customers", () => {
    const insight = buildArnabelaInsight(
      baseInput({
        respondingCustomers: 0,
        overallPurchaseIntent: 0,
        wouldBuyPercentage: 0,
        wouldConsiderPercentage: 0,
        rejectedPercentage: 0,
        positiveDrivers: [],
        negativeDrivers: [],
        topArchetype: null,
      }),
    );

    assert.match(insight.headline, /not enough completed test data/i);
    assert.match(insight.explanation, /No simulated customer perspectives completed/i);
    assert.equal(insight.nextExperimentKind, "none");
    assert.doesNotMatch(insight.headline, /definitely/i);
  });

  it("reports strong simulated demand when purchase intent is high", () => {
    const insight = buildArnabelaInsight(
      baseInput({
        overallPurchaseIntent: 7.6,
        wouldBuyPercentage: 58,
        wouldConsiderPercentage: 22,
        rejectedPercentage: 20,
        negativeDrivers: [
          {
            label: "Would compare alternatives",
            count: 18,
            percentage: 18,
          },
        ],
      }),
    );

    assert.match(insight.headline, /strong purchase intent/i);
    assert.match(insight.explanation, /7\.6\/10/);
    assert.match(insight.explanation, /58% would buy/);
    assert.doesNotMatch(
      insight.nextExperiment,
      /definitely increase sales/i,
    );
  });

  it("reports limited intent when purchase intent is low", () => {
    const insight = buildArnabelaInsight(
      baseInput({
        overallPurchaseIntent: 3.1,
        wouldBuyPercentage: 8,
        wouldConsiderPercentage: 18,
        rejectedPercentage: 74,
        averagePriceAcceptance: 6,
        averageTrust: 6,
        negativeDrivers: [
          {
            label: "Not relevant to me",
            count: 41,
            percentage: 41,
          },
        ],
      }),
    );

    assert.match(insight.headline, /purchase intent was limited/i);
    assert.match(insight.explanation, /74% rejected/);
    assert.match(insight.barrier, /Not relevant to me/);
  });

  it("treats price as the dominant barrier and recommends a price test", () => {
    const insight = buildArnabelaInsight(
      baseInput({
        overallPurchaseIntent: 7.2,
        wouldBuyPercentage: 46,
        averagePriceAcceptance: 3.8,
        negativeDrivers: [
          {
            label: "Price feels too high",
            count: 32,
            percentage: 32,
          },
        ],
      }),
    );

    assert.match(insight.headline, /price was the most frequently cited barrier/i);
    assert.match(insight.barrier, /Price feels too high/);
    assert.match(insight.barrier, /32 of 100 responding perspectives \(32%\)/);
    assert.equal(insight.nextExperimentKind, "price");
    assert.match(insight.nextExperiment, /price/i);
    assert.doesNotMatch(insight.headline, /Demand is strong, but price is limiting conversion/);
  });

  it("treats trust as the dominant barrier and recommends a proof test", () => {
    const insight = buildArnabelaInsight(
      baseInput({
        overallPurchaseIntent: 5.4,
        wouldBuyPercentage: 22,
        wouldConsiderPercentage: 41,
        averageTrust: 4.1,
        negativeDrivers: [
          {
            label: "Need proof it actually works",
            count: 40,
            percentage: 40,
          },
        ],
      }),
    );

    assert.match(insight.headline, /stronger proof/i);
    assert.match(insight.barrier, /Need proof it actually works/);
    assert.equal(insight.nextExperimentKind, "trust");
    assert.match(insight.nextExperiment, /proof|evidence|guarantee/i);

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
    assert.match(draft.description, /proof of outcomes/i);
    assert.ok(
      draft.keyFeatures.includes(
        "Proof of outcomes and guarantee language",
      ),
    );
  });

  it("uses the strongest positive driver as the opportunity", () => {
    const insight = buildArnabelaInsight(
      baseInput({
        wouldBuyPercentage: 44,
        wouldConsiderPercentage: 20,
        positiveDrivers: [
          {
            label: "Strong fit with digital behaviour",
            count: 50,
            percentage: 50,
          },
        ],
        negativeDrivers: [
          {
            label: "Would compare alternatives",
            count: 12,
            percentage: 12,
          },
        ],
      }),
    );

    assert.match(
      insight.opportunity,
      /Strong fit with digital behaviour/,
    );
    assert.match(insight.explanation, /Customers frequently cited/);
    assert.match(insight.explanation, /50%\)/);
  });

  it("prepopulates a lower price for a price recommendation", () => {
    const insight = buildArnabelaInsight(
      baseInput({
        overallPurchaseIntent: 7.2,
        averagePriceAcceptance: 3.8,
        negativeDrivers: [
          {
            label: "Price feels too high",
            count: 32,
            percentage: 32,
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

    assert.equal(draft.nextExperimentKind, "price");
    assert.equal(draft.price, 159.2);
    assert.match(draft.description, /more accessible price/i);
    assert.equal(draft.productName, "Field Assistant");
  });
});
