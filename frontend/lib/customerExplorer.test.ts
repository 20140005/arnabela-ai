import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CustomerResponse } from "./simulationClient.ts";
import {
  decisionFromResponse,
  selectPreviewCustomers,
} from "./customerExplorer.ts";

function fakeResponse(
  customerId: string,
  options?: {
    would_buy?: boolean;
    would_consider?: boolean;
  },
): CustomerResponse {
  return {
    customer_id: customerId,
    overall_interest: 6,
    understanding: 7,
    trust: 5,
    price_acceptance: 4,
    purchase_intent: 3,
    would_buy: options?.would_buy ?? false,
    would_consider: options?.would_consider ?? true,
    primary_objection: "Needs more information.",
    secondary_objection: "Would compare alternatives.",
    positive_factors: ["Relevant product"],
    negative_factors: ["Needs more information"],
    questions: ["What support is included?"],
    reasoning: "Simulated reasoning for tests.",
  };
}

describe("decisionFromResponse", () => {
  it("maps buy, consider and reject without overlap", () => {
    assert.equal(
      decisionFromResponse({
        would_buy: true,
        would_consider: true,
      }),
      "BUY",
    );
    assert.equal(
      decisionFromResponse({
        would_buy: false,
        would_consider: true,
      }),
      "CONSIDER",
    );
    assert.equal(
      decisionFromResponse({
        would_buy: false,
        would_consider: false,
      }),
      "REJECT",
    );
  });
});

describe("selectPreviewCustomers", () => {
  it("chooses different archetypes before repeating one", () => {
    const responses = [
      "001",
      "002",
      "011",
      "012",
      "021",
      "031",
      "041",
      "051",
    ].map((id) => fakeResponse(id));

    const profiles = new Map([
      ["001", { name: "One", archetype: "Budget-Focused Buyer" }],
      ["002", { name: "Two", archetype: "Budget-Focused Buyer" }],
      ["011", { name: "Eleven", archetype: "Premium Value Buyer" }],
      ["012", { name: "Twelve", archetype: "Premium Value Buyer" }],
      ["021", { name: "Twenty One", archetype: "Tech Enthusiast" }],
      ["031", { name: "Thirty One", archetype: "Risk-Averse Researcher" }],
      ["041", { name: "Forty One", archetype: "Convenience-First Buyer" }],
      ["051", { name: "Fifty One", archetype: "Family-Focused Buyer" }],
    ]);

    const preview = selectPreviewCustomers(responses, profiles, 6);

    assert.equal(preview.length, 6);
    assert.deepEqual(
      preview.map((customer) => customer.customer_id),
      ["001", "011", "021", "031", "041", "051"],
    );
    assert.equal(
      new Set(preview.map((customer) => customer.archetype)).size,
      6,
    );
  });

  it("falls back to available responses when profiles are missing", () => {
    const responses = ["001", "002", "003"].map((id) =>
      fakeResponse(id),
    );

    const preview = selectPreviewCustomers(
      responses,
      new Map(),
      6,
    );

    assert.deepEqual(
      preview.map((customer) => customer.customer_id),
      ["001", "002", "003"],
    );
    assert.equal(preview[0]?.name, "Customer 001");
    assert.equal(preview[0]?.archetype, "Simulated Customer");
  });

  it("uses actual profile names instead of hardcoded labels", () => {
    const preview = selectPreviewCustomers(
      [fakeResponse("001")],
      new Map([
        [
          "001",
          {
            name: "Sarah Williams",
            archetype: "Budget-Focused Buyer",
          },
        ],
      ]),
      6,
    );

    assert.equal(preview[0]?.name, "Sarah Williams");
    assert.equal(
      preview[0]?.archetype,
      "Budget-Focused Buyer",
    );
  });
});
