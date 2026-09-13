import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CustomerResponse } from "./simulationClient.ts";
import { buildDecisionDrivers } from "./decisionDrivers.ts";

function fakeResponse(
  customerId: string,
  options?: Partial<CustomerResponse>,
): CustomerResponse {
  return {
    customer_id: customerId,
    overall_interest: 6,
    understanding: 7,
    trust: 5,
    price_acceptance: 4,
    purchase_intent: 3,
    would_buy: false,
    would_consider: true,
    primary_objection: "Needs more information.",
    secondary_objection: "Would compare alternatives.",
    positive_factors: ["Relevant product"],
    negative_factors: ["Needs more information"],
    questions: ["What support is included?"],
    reasoning: `Reasoning from customer ${customerId}.`,
    ...options,
  };
}

describe("buildDecisionDrivers", () => {
  it("returns empty drivers when there are zero responses", () => {
    const drivers = buildDecisionDrivers([], new Map(), {
      totalCustomers: 100,
      failedCustomers: 100,
    });

    assert.equal(drivers.respondingCustomers, 0);
    assert.equal(drivers.failedCustomers, 100);
    assert.deepEqual(drivers.positive, []);
    assert.deepEqual(drivers.negative, []);
  });

  it("uses a single responding customer as the percentage denominator", () => {
    const drivers = buildDecisionDrivers(
      [
        fakeResponse("001", {
          positive_factors: ["Time savings"],
          primary_objection: "Price feels too high",
        }),
      ],
      new Map([
        [
          "001",
          {
            name: "One",
            archetype: "Budget-Focused Buyer",
          },
        ],
      ]),
    );

    assert.equal(drivers.respondingCustomers, 1);
    assert.equal(drivers.positive[0]?.count, 1);
    assert.equal(drivers.positive[0]?.percentage, 100);
    assert.equal(drivers.negative[0]?.count, 1);
    assert.equal(drivers.negative[0]?.percentage, 100);
    assert.deepEqual(drivers.positive[0]?.archetypes, [
      { name: "Budget-Focused Buyer", count: 1 },
    ]);
  });

  it("treats a shared factor as 100% when every response mentions it", () => {
    const responses = ["001", "002", "003"].map((id) =>
      fakeResponse(id, {
        positive_factors: ["Clear value"],
        primary_objection: "Needs proof",
      }),
    );

    const drivers = buildDecisionDrivers(responses, new Map());

    assert.equal(drivers.positive.length, 1);
    assert.equal(drivers.positive[0]?.count, 3);
    assert.equal(drivers.positive[0]?.percentage, 100);
    assert.equal(drivers.negative[0]?.count, 3);
    assert.equal(drivers.negative[0]?.percentage, 100);
  });

  it("ignores empty factors and blank objections", () => {
    const drivers = buildDecisionDrivers(
      [
        fakeResponse("001", {
          positive_factors: ["", "   ", "Useful"],
          primary_objection: "   ",
        }),
        fakeResponse("002", {
          positive_factors: [],
          primary_objection: "",
        }),
      ],
      new Map(),
    );

    assert.equal(drivers.respondingCustomers, 2);
    assert.equal(drivers.positive.length, 1);
    assert.equal(drivers.positive[0]?.label, "Useful");
    assert.equal(drivers.positive[0]?.count, 1);
    assert.equal(drivers.positive[0]?.percentage, 50);
    assert.deepEqual(drivers.negative, []);
  });

  it("does not count failed customers in the denominator", () => {
    const drivers = buildDecisionDrivers(
      [
        fakeResponse("001", {
          positive_factors: ["Time savings"],
          primary_objection: "Price feels too high",
        }),
        fakeResponse("011", {
          positive_factors: ["Time savings"],
          primary_objection: "Needs proof",
        }),
      ],
      new Map(),
      {
        totalCustomers: 3,
        failedCustomers: 1,
      },
    );

    assert.equal(drivers.respondingCustomers, 2);
    assert.equal(drivers.failedCustomers, 1);
    assert.equal(drivers.positive[0]?.count, 2);
    assert.equal(drivers.positive[0]?.percentage, 100);
    assert.equal(drivers.negative[0]?.percentage, 50);
  });

  it("derives most affected archetypes from actual profiles", () => {
    const responses = [
      fakeResponse("001", {
        positive_factors: ["Time savings"],
        primary_objection: "Price feels too high",
      }),
      fakeResponse("002", {
        positive_factors: ["Time savings"],
        primary_objection: "Price feels too high",
      }),
      fakeResponse("011", {
        positive_factors: ["Time savings"],
        primary_objection: "Price feels too high",
      }),
      fakeResponse("021", {
        positive_factors: ["Easy to use"],
        primary_objection: "Needs proof",
      }),
    ];

    const profiles = new Map([
      ["001", { name: "One", archetype: "Budget-Focused Buyer" }],
      ["002", { name: "Two", archetype: "Budget-Focused Buyer" }],
      ["011", { name: "Eleven", archetype: "Family-Focused Buyer" }],
      ["021", { name: "Twenty", archetype: "Tech Enthusiast" }],
    ]);

    const drivers = buildDecisionDrivers(responses, profiles);
    const price = drivers.negative.find(
      (driver) => driver.label === "Price feels too high",
    );

    assert.equal(price?.count, 3);
    assert.equal(price?.percentage, 75);
    assert.deepEqual(
      price?.archetypes.map((item) => item.name),
      ["Budget-Focused Buyer", "Family-Focused Buyer"],
    );
    assert.equal(price?.archetypes[0]?.count, 2);
    assert.equal(price?.representatives[0]?.name, "One");
    assert.equal(
      drivers.positive[0]?.archetypes[0]?.name,
      "Budget-Focused Buyer",
    );
  });

  it("counts a duplicated factor in one response only once", () => {
    const drivers = buildDecisionDrivers(
      [
        fakeResponse("001", {
          positive_factors: [
            "Time savings",
            "time savings",
            "Time savings",
          ],
        }),
      ],
      new Map(),
    );

    assert.equal(drivers.positive.length, 1);
    assert.equal(drivers.positive[0]?.count, 1);
    assert.equal(drivers.positive[0]?.percentage, 100);
  });
});
