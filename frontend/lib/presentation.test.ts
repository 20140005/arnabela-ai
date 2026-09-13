import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CustomerResponse } from "./simulationClient.ts";
import {
  formatPrice,
  formatPricesInText,
  presentCustomerReasoning,
} from "./presentation.ts";

function fakeResponse(
  options?: Partial<CustomerResponse>,
): CustomerResponse {
  return {
    customer_id: "021",
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
    reasoning: "Simulated reasoning for tests.",
    ...options,
  };
}

describe("formatPrice", () => {
  it("formats whole Australian dollar amounts with commas", () => {
    assert.equal(formatPrice(2499), "$2,499");
    assert.equal(formatPrice(199), "$199");
  });

  it("supports an AUD suffix when requested", () => {
    assert.equal(formatPrice(2499, { withCurrencyCode: true }), "$2,499 AUD");
  });

  it("keeps fractional amounts to two decimals", () => {
    assert.equal(formatPrice(159.2), "$159.20");
  });
});

describe("formatPricesInText", () => {
  it("rewrites bare dollar amounts inside copy", () => {
    assert.equal(
      formatPricesInText("At $2499 the price feels high."),
      "At $2,499 the price feels high.",
    );
  });
});

describe("presentCustomerReasoning", () => {
  it("replaces internal adjustment language with a human perspective", () => {
    const presented = presentCustomerReasoning({
      ...fakeResponse({
        would_buy: true,
        would_consider: false,
        price_acceptance: 7,
        positive_factors: [
          "Strong fit with digital behaviour",
          "Automatic expiry-date tracking",
        ],
        primary_objection: "Need proof it actually works",
        reasoning:
          "As a Tech Enthusiast, this customer responds based on their individual price sensitivity, risk tolerance, trust requirements, digital behaviour and motivations. The product received a relevance adjustment of 3, a price adjustment of -1, and a trust adjustment of 0.",
      }),
      productPrice: 2499,
      motivations: ["Trying useful new technology"],
    });

    assert.doesNotMatch(presented, /adjustment/i);
    assert.doesNotMatch(presented, /As a Tech Enthusiast, this customer/i);
    assert.match(presented, /I'd be interested/i);
    assert.match(presented, /\$2,499/);
  });

  it("preserves natural reasoning while formatting prices", () => {
    const presented = presentCustomerReasoning({
      ...fakeResponse({
        reasoning:
          "I like the convenience, but at $2499 I'd want stronger proof before buying.",
      }),
    });

    assert.match(presented, /I like the convenience/);
    assert.match(presented, /\$2,499/);
    assert.doesNotMatch(presented, /\$2499\b/);
  });
});
