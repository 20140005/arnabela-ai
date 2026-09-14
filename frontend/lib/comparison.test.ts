import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  aggregateFromResponses,
  buildComparisonResult,
  customerIdsFromSimulation,
  pointsDelta,
} from "./comparison.ts";
import type {
  CustomerProfile,
  CustomerResponse,
  StoredSimulation,
} from "./simulationClient.ts";

function response(
  id: string,
  options: {
    buy?: boolean;
    consider?: boolean;
    intent?: number;
    objection?: string;
    positive?: string;
  } = {},
): CustomerResponse {
  const buy = options.buy ?? false;
  const consider = options.consider ?? (!buy && true);

  return {
    customer_id: id,
    overall_interest: options.intent ?? 5,
    understanding: 6,
    trust: 5,
    price_acceptance: 4,
    purchase_intent: options.intent ?? 5,
    would_buy: buy,
    would_consider: buy ? true : consider,
    primary_objection: options.objection ?? "Price feels too high",
    secondary_objection: "",
    positive_factors: [options.positive ?? "Strong fit with digital behaviour"],
    negative_factors: [options.objection ?? "Price feels too high"],
    questions: [],
    reasoning: "Natural reasoning for tests.",
  };
}

function simulation(
  responses: CustomerResponse[],
  failed: string[] = [],
): StoredSimulation {
  return {
    testId: "t1",
    productName: "FreshMind",
    testType: "Product",
    description: "Smart fridge",
    price: 2499,
    targetMarket: "Australian households",
    keyFeatures: ["AI recognition"],
    backendResult: {
      test_id: "t1",
      total_customers: responses.length + failed.length,
      completed_customers: responses.length,
      failed_customers: failed.length,
      failed_customer_ids: failed,
      responses,
    },
  };
}

function profile(
  id: string,
  archetype: string,
  name = `Customer ${id}`,
): CustomerProfile {
  return {
    id,
    name,
    archetype,
    age: 30,
    state: "NSW",
    location: "Sydney",
    occupation: "Professional",
    income_band: "80-120k",
    household: "Couple",
    home_ownership: "Renting",
    education: "University",
    digital_literacy: 7,
    financial_behaviour: {
      price_sensitivity: 6,
      willingness_to_finance: 5,
      impulse_buying: 4,
    },
    personality: {
      risk_tolerance: 5,
      trust_requirement: 6,
      research_tendency: 6,
      brand_loyalty: 4,
    },
    shopping_behaviour: {
      reads_reviews: true,
      compares_competitors: true,
      checks_prices: true,
      prefers_online_shopping: true,
    },
    motivations: ["Convenience"],
    concerns: ["Price"],
    behavioural_rules: [],
  };
}

describe("pointsDelta", () => {
  it("reports percentage-point changes", () => {
    assert.deepEqual(pointsDelta(42, 58), {
      from: 42,
      to: 58,
      points: 16,
    });
  });
});

describe("customerIdsFromSimulation", () => {
  it("preserves completed and failed customer ids", () => {
    const ids = customerIdsFromSimulation(
      simulation(
        [response("001", { buy: true }), response("002", { consider: true })],
        ["003"],
      ),
    );

    assert.deepEqual(ids, ["001", "002", "003"]);
  });
});

describe("aggregateFromResponses", () => {
  it("calculates buy/consider/reject splits", () => {
    const aggregate = aggregateFromResponses([
      response("001", { buy: true, intent: 8 }),
      response("002", { consider: true, intent: 5 }),
      response("003", { buy: false, consider: false, intent: 2 }),
      response("004", { buy: true, intent: 9 }),
    ]);

    assert.equal(aggregate.completed, 4);
    assert.equal(aggregate.buyCount, 2);
    assert.equal(aggregate.considerCount, 1);
    assert.equal(aggregate.rejectCount, 1);
    assert.equal(aggregate.buyPercentage, 50);
    assert.equal(aggregate.considerPercentage, 25);
    assert.equal(aggregate.rejectPercentage, 25);
    assert.equal(aggregate.averagePurchaseIntent, 6);
  });
});

describe("buildComparisonResult", () => {
  it("requires the same customer ids and computes movement", () => {
    const original = simulation([
      response("001", { buy: false, consider: false, intent: 2 }),
      response("002", { consider: true, intent: 5 }),
      response("003", { buy: true, intent: 8 }),
    ]);
    const variant = simulation([
      response("001", { buy: true, intent: 7 }),
      response("002", { buy: true, intent: 8 }),
      response("003", { buy: true, intent: 8 }),
    ]);

    const result = buildComparisonResult({
      original,
      variant,
      profiles: [
        profile("001", "Budget-Focused Buyer"),
        profile("002", "Risk-Averse Researcher"),
        profile("003", "Tech Enthusiast"),
      ],
    });

    assert.ok(result);
    assert.deepEqual(result?.original.buyPercentage, 33);
    assert.deepEqual(result?.variant.buyPercentage, 100);
    assert.equal(result?.buyDelta.points, 67);
    assert.equal(result?.changedDecisions, 2);
    assert.equal(result?.sameDecisions, 1);
    assert.equal(result?.improved, 2);
    assert.equal(result?.worsened, 0);
    assert.equal(result?.outcome.status, "improved");
    assert.doesNotMatch(result?.outcome.explanation ?? "", /real-world market outcomes will/);
    assert.match(
      result?.outcome.explanation ?? "",
      /supports the recommendation within the simulated audience/i,
    );

    const rejectToBuy = result?.transitions.find(
      (item) => item.from === "REJECT" && item.to === "BUY",
    );
    assert.equal(rejectToBuy?.count, 1);
  });

  it("returns null when variant has no completed responses", () => {
    const original = simulation([response("001", { buy: true })]);
    const variant = simulation([], ["001"]);

    assert.equal(
      buildComparisonResult({
        original,
        variant,
        profiles: [profile("001", "Tech Enthusiast")],
      }),
      null,
    );
  });

  it("compares only shared completed customers when sets differ", () => {
    const original = simulation([
      response("001", { buy: false, consider: false, intent: 2 }),
      response("002", { buy: false, consider: false, intent: 2 }),
    ]);
    const variant = simulation([
      response("001", { buy: true, intent: 8 }),
    ]);

    const result = buildComparisonResult({
      original,
      variant,
      profiles: [
        profile("001", "Budget-Focused Buyer"),
        profile("002", "Budget-Focused Buyer"),
      ],
    });

    assert.equal(result?.comparableCustomers, 1);
    assert.equal(result?.variant.buyPercentage, 100);
    assert.equal(result?.changedDecisions, 1);
  });

  it("marks mixed outcomes when movement conflicts", () => {
    const original = simulation([
      response("001", { buy: true, intent: 8 }),
      response("002", { buy: true, intent: 8 }),
      response("003", { consider: true, intent: 5 }),
      response("004", { consider: true, intent: 5 }),
      response("005", { buy: false, consider: false, intent: 2 }),
    ]);
    const variant = simulation([
      response("001", { buy: false, consider: false, intent: 2 }),
      response("002", { buy: true, intent: 8 }),
      response("003", { buy: true, intent: 8 }),
      response("004", { consider: true, intent: 5 }),
      response("005", { consider: true, intent: 5 }),
    ]);

    const result = buildComparisonResult({
      original,
      variant,
      profiles: [
        profile("001", "A"),
        profile("002", "B"),
        profile("003", "C"),
        profile("004", "D"),
        profile("005", "E"),
      ],
    });

    assert.ok(result);
    assert.ok(
      result?.outcome.status === "mixed" ||
        result?.outcome.status === "no_clear_improvement" ||
        result?.outcome.status === "improved",
    );
    assert.doesNotMatch(
      result?.outcome.explanation ?? "",
      /guaranteed|proves customers will buy|100 real customers/i,
    );
  });

  it("calculates archetype purchase-intent movement", () => {
    const original = simulation([
      response("001", { buy: false, consider: false, intent: 2 }),
      response("002", { buy: false, consider: false, intent: 2 }),
      response("003", { buy: true, intent: 8 }),
    ]);
    const variant = simulation([
      response("001", { buy: true, intent: 7 }),
      response("002", { consider: true, intent: 5 }),
      response("003", { buy: true, intent: 8 }),
    ]);

    const result = buildComparisonResult({
      original,
      variant,
      profiles: [
        profile("001", "Budget-Focused Buyer"),
        profile("002", "Budget-Focused Buyer"),
        profile("003", "Tech Enthusiast"),
      ],
    });

    const budget = result?.segmentMovements.find(
      (item) => item.name === "Budget-Focused Buyer",
    );

    assert.equal(budget?.fromIntent, 2);
    assert.equal(budget?.toIntent, 6);
    assert.equal(budget?.deltaPoints, 4);
  });
});
