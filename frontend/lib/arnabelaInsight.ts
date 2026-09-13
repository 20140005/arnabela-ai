import type { DecisionDriver } from "./decisionDrivers";

export type InsightArchetype = {
  name: string;
  customers: number;
  purchaseIntent: number;
};

export type InsightInput = {
  respondingCustomers: number;
  overallPurchaseIntent: number;
  wouldBuyPercentage: number;
  wouldConsiderPercentage: number;
  rejectedPercentage: number;
  averageInterest: number;
  averageUnderstanding: number;
  averageTrust: number;
  averagePriceAcceptance: number;
  positiveDrivers: Array<
    Pick<DecisionDriver, "label" | "count" | "percentage">
  >;
  negativeDrivers: Array<
    Pick<DecisionDriver, "label" | "count" | "percentage">
  >;
  topArchetype: InsightArchetype | null;
};

export type NextExperimentKind =
  | "price"
  | "trust"
  | "clarity"
  | "comparison"
  | "segment"
  | "value"
  | "none";

export type ArnabelaInsight = {
  headline: string;
  explanation: string;
  opportunity: string;
  barrier: string;
  nextExperiment: string;
  nextExperimentKind: NextExperimentKind;
};

export type ProductSnapshot = {
  productName: string;
  testType: string;
  description: string;
  price: number;
  targetMarket: string;
  keyFeatures: string[];
};

export type NextTestDraft = ProductSnapshot & {
  insightHeadline: string;
  nextExperiment: string;
  nextExperimentKind: NextExperimentKind;
};

type BarrierTheme =
  | "price"
  | "trust"
  | "clarity"
  | "comparison"
  | "other";

function intentBand(
  intent: number,
): "high" | "moderate" | "low" {
  if (intent >= 7) {
    return "high";
  }

  if (intent >= 5) {
    return "moderate";
  }

  return "low";
}

export function classifyBarrierTheme(label: string): BarrierTheme {
  const text = label.toLowerCase();

  if (
    /\b(price|priced|cost|costs|expensive|afford|affordable|cheap|fee|fees|too high)\b/.test(
      text,
    )
  ) {
    return "price";
  }

  if (
    /\b(trust|proof|prove|warrant|warrantees|guarantee|evidence|review|reviews|believ|reputat|support)\b/.test(
      text,
    )
  ) {
    return "trust";
  }

  if (
    /\b(understand|understanding|unclear|confus|explain|complicat|what it does|value proposition)\b/.test(
      text,
    ) ||
    /\b(information|more info|details|how it works)\b/.test(text)
  ) {
    return "clarity";
  }

  if (
    /\b(compar|alternative|alternatives|competitor|competitors)\b/.test(
      text,
    )
  ) {
    return "comparison";
  }

  return "other";
}

function customerCountLabel(count: number) {
  return count === 1 ? "1 responding customer" : `${count} responding customers`;
}

function citedDriver(
  driver: Pick<DecisionDriver, "label" | "count" | "percentage">,
  respondingCustomers: number,
) {
  return `"${driver.label}", cited by ${driver.count} of ${respondingCustomers} responding customers (${driver.percentage}%)`;
}

function emptyInsight(): ArnabelaInsight {
  return {
    headline:
      "There is not enough completed simulation data to form a recommendation.",
    explanation:
      "No simulated customers completed this test, so Arnabela cannot identify what pulled the audience in, what pushed them away, or what to test next.",
    opportunity:
      "Run a simulation that produces completed customer responses.",
    barrier:
      "No responding customers were available to observe a barrier.",
    nextExperiment:
      "Re-run the simulation and return here once customer responses are available.",
    nextExperimentKind: "none",
  };
}

function buildHeadline(
  band: "high" | "moderate" | "low",
  theme: BarrierTheme | null,
  considerLeads: boolean,
  topArchetype: InsightArchetype | null,
) {
  if (band === "high" && theme === "price") {
    return "Simulated demand is strong, but price was the most frequently cited barrier.";
  }

  if (band === "high" && theme === "trust") {
    return "Simulated demand is strong, but customers frequently cited a need for more proof.";
  }

  if (band === "high" && theme === "clarity") {
    return "Simulated demand is strong, but customers still asked for a clearer explanation.";
  }

  if (band === "high") {
    return "Simulated customers showed strong purchase intent.";
  }

  if (band === "moderate" && theme === "price") {
    return "Simulated interest is present, but price was the strongest observed barrier.";
  }

  if (band === "moderate" && theme === "trust") {
    return "Simulated interest exists, but customers frequently cited a need for stronger proof.";
  }

  if (band === "moderate" && considerLeads) {
    return "Simulated customers showed interest, but fewer were ready to buy.";
  }

  if (
    band === "moderate" &&
    topArchetype &&
    topArchetype.purchaseIntent >= 7
  ) {
    return `The proposition performed most strongly with ${topArchetype.name} in this simulation.`;
  }

  if (band === "moderate") {
    return "Simulated interest is mixed, and conversion was limited.";
  }

  if (theme === "price") {
    return "Simulated purchase intent was limited, and price was the strongest observed barrier.";
  }

  if (theme === "trust") {
    return "Simulated purchase intent was limited, and customers frequently cited trust or proof concerns.";
  }

  return "Simulated purchase intent was limited across the audience.";
}

function buildNextExperiment(
  theme: BarrierTheme | null,
  topArchetype: InsightArchetype | null,
  averagePriceAcceptance: number,
  averageTrust: number,
  averageUnderstanding: number,
): { text: string; kind: NextExperimentKind } {
  if (theme === "price" || averagePriceAcceptance <= 4) {
    return {
      kind: "price",
      text: "Test a more accessible price point, or a clearer explanation of why the current price is justified, then compare purchase intent with this baseline.",
    };
  }

  if (theme === "trust" || averageTrust <= 4.5) {
    return {
      kind: "trust",
      text: "Test a variant with stronger proof, evidence of outcomes, or guarantee language, then compare trust and purchase intent with this baseline.",
    };
  }

  if (theme === "clarity" || averageUnderstanding <= 4.5) {
    return {
      kind: "clarity",
      text: "Test a variant that more clearly explains what the product does, who it is for, and what changes after purchase.",
    };
  }

  if (theme === "comparison") {
    return {
      kind: "comparison",
      text: "Test a variant that makes the difference versus alternatives more explicit before asking customers to decide.",
    };
  }

  if (topArchetype && topArchetype.purchaseIntent >= 7) {
    return {
      kind: "segment",
      text: `Test messaging focused on ${topArchetype.name}, the strongest-performing segment observed in this simulation.`,
    };
  }

  return {
    kind: "value",
    text: "Test a tighter value proposition that leads with the strongest observed benefit and addresses the strongest observed barrier.",
  };
}

export function buildArnabelaInsight(
  input: InsightInput,
): ArnabelaInsight {
  if (input.respondingCustomers <= 0) {
    return emptyInsight();
  }

  const positive = input.positiveDrivers[0] ?? null;
  const negative = input.negativeDrivers[0] ?? null;
  const theme = negative ? classifyBarrierTheme(negative.label) : null;
  const band = intentBand(input.overallPurchaseIntent);
  const considerLeads =
    input.wouldConsiderPercentage > input.wouldBuyPercentage &&
    input.wouldConsiderPercentage >= 20;
  const usableArchetype =
    input.topArchetype &&
    input.topArchetype.name !== "Simulated Customer"
      ? input.topArchetype
      : null;

  const explanationParts = [
    `${customerCountLabel(input.respondingCustomers)} completed this test. Average purchase intent was ${input.overallPurchaseIntent}/10. ${input.wouldBuyPercentage}% would buy, ${input.wouldConsiderPercentage}% would consider, and ${input.rejectedPercentage}% rejected the proposition.`,
  ];

  if (negative) {
    explanationParts.push(
      `The strongest observed barrier was ${citedDriver(negative, input.respondingCustomers)}.`,
    );
  }

  if (positive) {
    explanationParts.push(
      `Customers frequently cited ${citedDriver(positive, input.respondingCustomers)} as a pull toward the product.`,
    );
  }

  if (usableArchetype) {
    explanationParts.push(
      `${usableArchetype.name} was the strongest-performing segment observed, with average purchase intent of ${usableArchetype.purchaseIntent}/10 across ${usableArchetype.customers} responding customers.`,
    );
  }

  let opportunity: string;

  if (considerLeads) {
    opportunity = `The consider group (${input.wouldConsiderPercentage}%) is the largest near-term conversion opportunity observed in this simulation.`;
  } else if (positive) {
    opportunity = `The strongest observed pull was ${citedDriver(positive, input.respondingCustomers)}.`;
  } else if (usableArchetype) {
    opportunity = `Simulated responses suggest the strongest opportunity is concentrating on ${usableArchetype.name}.`;
  } else {
    opportunity =
      "No single positive driver stood out. The opportunity is to strengthen the core proposition before testing a variant.";
  }

  let barrier: string;

  if (negative) {
    barrier = `The strongest observed barrier was ${citedDriver(negative, input.respondingCustomers)}.`;
  } else if (input.averagePriceAcceptance <= 4) {
    barrier = `No dominant primary objection was returned, but average price acceptance was ${input.averagePriceAcceptance}/10 among responding customers.`;
  } else if (input.averageTrust <= 4.5) {
    barrier = `No dominant primary objection was returned, but average trust was ${input.averageTrust}/10 among responding customers.`;
  } else {
    barrier =
      "No dominant primary objection was returned by responding customers.";
  }

  const next = buildNextExperiment(
    theme,
    usableArchetype,
    input.averagePriceAcceptance,
    input.averageTrust,
    input.averageUnderstanding,
  );

  return {
    headline: buildHeadline(
      band,
      theme,
      considerLeads,
      usableArchetype,
    ),
    explanation: explanationParts.join(" "),
    opportunity,
    barrier,
    nextExperiment: next.text,
    nextExperimentKind: next.kind,
  };
}

function appendVariantNote(description: string, note: string) {
  const trimmed = description.trim();

  if (!trimmed) {
    return note;
  }

  return `${trimmed}\n\n${note}`;
}

function withFeature(features: string[], feature: string) {
  const exists = features.some(
    (item) => item.toLowerCase() === feature.toLowerCase(),
  );

  if (exists) {
    return features;
  }

  return [...features, feature];
}

export function buildNextTestDraft(
  product: ProductSnapshot,
  insight: ArnabelaInsight,
): NextTestDraft {
  let description = product.description;
  let price = product.price;
  let keyFeatures = [...(product.keyFeatures ?? [])];

  switch (insight.nextExperimentKind) {
    case "price":
      if (price > 0) {
        price = Math.round(price * 0.8 * 100) / 100;
      }

      description = appendVariantNote(
        description,
        "This variant tests a more accessible price point, or a clearer explanation of why the current price is justified, against the previous simulation baseline.",
      );
      break;

    case "trust":
      description = appendVariantNote(
        description,
        "This variant adds stronger proof of outcomes, evidence, or guarantee language for customers who wanted more reason to trust the proposition.",
      );
      keyFeatures = withFeature(
        keyFeatures,
        "Proof of outcomes and guarantee language",
      );
      break;

    case "clarity":
      description = appendVariantNote(
        description,
        "This variant more clearly explains what the product does, who it is for, and what changes after purchase.",
      );
      break;

    case "comparison":
      description = appendVariantNote(
        description,
        "This variant makes the difference versus alternatives more explicit before asking customers to decide.",
      );
      break;

    case "segment":
      description = appendVariantNote(
        description,
        "This variant focuses messaging on the strongest-performing customer segment observed in the previous simulation.",
      );
      break;

    case "value":
      description = appendVariantNote(
        description,
        "This variant tightens the value proposition around the strongest observed benefit and the strongest observed barrier.",
      );
      break;

    case "none":
      break;
  }

  return {
    productName: product.productName,
    testType: product.testType,
    description,
    price,
    targetMarket: product.targetMarket,
    keyFeatures,
    insightHeadline: insight.headline,
    nextExperiment: insight.nextExperiment,
    nextExperimentKind: insight.nextExperimentKind,
  };
}
