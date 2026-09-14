import type { DecisionDriver } from "./decisionDrivers";
import {
  selectRecommendation,
  scoreRecommendationCandidates,
  type RecommendationEvidence,
  type RecommendationType as EngineRecommendationType,
  type ScoredRecommendationCandidate,
} from "./recommendationEngine.ts";

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
  /** Full archetype set for multi-signal scoring. */
  archetypes?: InsightArchetype[];
  /** Optional product snapshot for positioning mismatch signals. */
  product?: ProductSnapshot | null;
};

export type NextExperimentKind =
  | "price"
  | "trust"
  | "clarity"
  | "comparison"
  | "segment"
  | "value"
  | "none";

export type RecommendationType = EngineRecommendationType;

export type { RecommendationEvidence, ScoredRecommendationCandidate };

export type StructuredRecommendation = {
  type: RecommendationType;
  title: string;
  reason: string;
  rationale: string;
  nextExperiment: string;
  evidence: RecommendationEvidence[];
  focusLabel: string | null;
  /** Legacy kind used by existing draft / home-page flows. */
  legacyKind: NextExperimentKind;
  canApply: boolean;
  applyBlockReason: string | null;
};

export type ArnabelaInsight = {
  headline: string;
  explanation: string;
  opportunity: string;
  barrier: string;
  nextExperiment: string;
  nextExperimentKind: NextExperimentKind;
  /** Structured, actionable recommendation used to prepare Version 2. */
  recommendation: StructuredRecommendation;
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
  return count === 1
    ? "1 responding perspective"
    : `${count} responding perspectives`;
}

function citedDriver(
  driver: Pick<DecisionDriver, "label" | "count" | "percentage">,
  respondingCustomers: number,
) {
  return `"${driver.label}", cited by ${driver.count} of ${respondingCustomers} responding perspectives (${driver.percentage}%)`;
}

function emptyInsight(): ArnabelaInsight {
  return {
    headline:
      "There is not enough completed test data to form a recommendation.",
    explanation:
      "No simulated customer perspectives completed this test, so Arnabela cannot identify what pulled the audience in, what pushed them away, or what to test next.",
    opportunity:
      "Run a test that produces completed customer responses.",
    barrier:
      "No responding customers were available to observe a barrier.",
    nextExperiment:
      "Run another test and return here once customer responses are available.",
    nextExperimentKind: "none",
    recommendation: {
      type: "NO_CLEAR_VARIANT",
      title: "No clear next experiment",
      reason:
        "No responding customers were available to observe a barrier.",
      rationale:
        "No responding customers were available to observe a barrier.",
      nextExperiment:
        "Run another test and return here once customer responses are available.",
      evidence: [],
      focusLabel: null,
      legacyKind: "none",
      canApply: false,
      applyBlockReason:
        "No responding customers were available to observe a barrier.",
    },
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
    return `The proposition performed most strongly with ${topArchetype.name} in this test.`;
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

function buildNextExperimentCopy(
  type: RecommendationType,
  topArchetype: InsightArchetype | null,
  focusLabel: string | null,
): string {
  switch (type) {
    case "LOWER_PRICE":
      return "Test whether a lower price converts the same audience while keeping the proposition otherwise identical.";
    case "STRONGER_PROOF":
      return "Test a proposition that makes how the product works easier to verify, using only information already in the concept.";
    case "STRENGTHEN_TRUST":
      return "Test trust-oriented messaging that clarifies reliability expectations using only information already implied by the concept.";
    case "REDUCE_PERCEIVED_RISK":
      return "Test a Version 2 that clarifies what the product does and does not do — without inventing guarantees.";
    case "CLARIFY_BENEFITS":
      return "Test a clearer explanation of what the product does, who it is for, and what changes after purchase.";
    case "EMPHASISE_CONVENIENCE":
      return "Test a convenience-led Version 2 that reorders the existing description toward saving time and reducing everyday effort.";
    case "EMPHASISE_SUSTAINABILITY":
      return "Test a Version 2 that leads with existing waste-reduction or sustainability benefits already described in the concept.";
    case "EMPHASISE_FAMILY_BENEFITS":
      return "Test a Version 2 that emphasises existing household/family benefits already implied by the concept.";
    case "LEAN_INTO_SEGMENT":
      return topArchetype
        ? `Test a Version 2 focused on the motivations of ${topArchetype.name}, using capabilities already present in the concept.`
        : "Test a Version 2 focused on the strongest-performing segment observed in this test.";
    case "STRENGTHEN_DIFFERENTIATION":
      return "Test a Version 2 that makes the existing differentiating capability more prominent — without inventing competitor claims.";
    case "STRONGER_VALUE":
      return focusLabel
        ? `Test a Version 2 that leads with "${focusLabel}" using benefits already present in the concept.`
        : "Test a tighter value proposition that leads with the strongest observed customer outcome.";
    case "NO_CLEAR_VARIANT":
      return "The current simulation does not show a strong enough signal for Arnabela to recommend one specific change.";
  }
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
      `${usableArchetype.name} was the strongest-performing segment observed, with average purchase intent of ${usableArchetype.purchaseIntent}/10 across ${usableArchetype.customers} responding perspectives.`,
    );
  }

  let opportunity: string;

  if (considerLeads) {
    opportunity = `The consider group (${input.wouldConsiderPercentage}%) is the largest near-term conversion opportunity observed in this test.`;
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
    barrier = `No dominant primary objection was returned, but average price acceptance was ${input.averagePriceAcceptance}/10 among responding perspectives.`;
  } else if (input.averageTrust <= 4.5) {
    barrier = `No dominant primary objection was returned, but average trust was ${input.averageTrust}/10 among responding perspectives.`;
  } else {
    barrier =
      "No dominant primary objection was returned by responding perspectives.";
  }

  const next = selectRecommendation({
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
    archetypes:
      input.archetypes && input.archetypes.length > 0
        ? input.archetypes
        : usableArchetype
          ? [usableArchetype]
          : [],
    product: input.product
      ? {
          productName: input.product.productName,
          description: input.product.description,
          price: input.product.price,
          targetMarket: input.product.targetMarket,
          keyFeatures: input.product.keyFeatures ?? [],
        }
      : null,
  });

  const recommendation: StructuredRecommendation = {
    type: next.type,
    title: next.title,
    reason: next.rationale,
    rationale: next.rationale,
    nextExperiment:
      next.nextExperiment ||
      buildNextExperimentCopy(next.type, usableArchetype, next.focusLabel),
    evidence: next.evidence,
    focusLabel: next.focusLabel,
    legacyKind: legacyKindFor(next.type),
    canApply: next.type !== "NO_CLEAR_VARIANT",
    applyBlockReason:
      next.type === "NO_CLEAR_VARIANT"
        ? next.rationale
        : null,
  };

  if (
    recommendation.type === "STRONGER_VALUE" &&
    theme === "comparison"
  ) {
    recommendation.legacyKind = "comparison";
  }

  if (recommendation.type === "STRENGTHEN_DIFFERENTIATION") {
    recommendation.legacyKind = "comparison";
  }

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
    nextExperiment: recommendation.nextExperiment,
    nextExperimentKind: recommendation.legacyKind,
    recommendation,
  };
}

export function buildNextTestDraft(
  product: ProductSnapshot,
  insight: ArnabelaInsight,
): NextTestDraft {
  const preview = buildVariantFromInsight(product, insight);
  const recommendation = preview.recommendation;

  return {
    productName: preview.variant.productName,
    testType: preview.variant.testType,
    description: preview.variant.description,
    price: preview.variant.price,
    targetMarket: preview.variant.targetMarket,
    keyFeatures: preview.variant.keyFeatures,
    insightHeadline: insight.headline,
    nextExperiment: recommendation.nextExperiment,
    nextExperimentKind: recommendation.legacyKind,
  };
}

export type ChangedField =
  | "productName"
  | "description"
  | "price"
  | "targetMarket"
  | "keyFeatures";

export type VariantPreview = {
  recommendation: StructuredRecommendation;
  parentTestId: string | null;
  original: ProductSnapshot;
  variant: ProductSnapshot;
  changedFields: ChangedField[];
  changeSummary: Array<{
    field: string;
    from: string;
    to: string;
    changed: boolean;
  }>;
};

export { scoreRecommendationCandidates, selectRecommendation };

function legacyKindFor(type: RecommendationType): NextExperimentKind {
  switch (type) {
    case "LOWER_PRICE":
      return "price";
    case "STRONGER_PROOF":
    case "STRENGTHEN_TRUST":
    case "REDUCE_PERCEIVED_RISK":
      return "trust";
    case "CLARIFY_BENEFITS":
      return "clarity";
    case "EMPHASISE_FAMILY_BENEFITS":
    case "LEAN_INTO_SEGMENT":
      return "segment";
    case "STRENGTHEN_DIFFERENTIATION":
      return "comparison";
    case "STRONGER_VALUE":
    case "EMPHASISE_CONVENIENCE":
    case "EMPHASISE_SUSTAINABILITY":
      return "value";
    case "NO_CLEAR_VARIANT":
      return "none";
  }
}

export function recommendationTitle(type: RecommendationType) {
  switch (type) {
    case "LOWER_PRICE":
      return "Test a lower price";
    case "STRONGER_PROOF":
      return "Make reliability easier to verify";
    case "STRONGER_VALUE":
      return "Strengthen the value proposition";
    case "CLARIFY_BENEFITS":
      return "Clarify how it works";
    case "STRENGTHEN_TRUST":
      return "Strengthen trust before asking for the sale";
    case "STRENGTHEN_DIFFERENTIATION":
      return "Make the differentiator clearer";
    case "EMPHASISE_CONVENIENCE":
      return "Lead with convenience";
    case "EMPHASISE_SUSTAINABILITY":
      return "Put food-waste reduction first";
    case "EMPHASISE_FAMILY_BENEFITS":
      return "Test a family-first proposition";
    case "LEAN_INTO_SEGMENT":
      return "Lean into the strongest segment";
    case "REDUCE_PERCEIVED_RISK":
      return "Reduce adoption risk";
    case "NO_CLEAR_VARIANT":
      return "No clear next experiment";
  }
}

function productCorpus(product: ProductSnapshot) {
  return [
    product.productName,
    product.description,
    product.targetMarket,
    ...(product.keyFeatures ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Deterministic LOWER_PRICE rule:
 * Reduce by 12%, then (for prices >= 100) round down to the nearest *.99
 * price point below the original. Otherwise round to 2 decimal places.
 * Never raises the price. If the *.99 candidate is not lower, fall back
 * to a plain 12% reduction (2 d.p.), then to an 20% reduction.
 *
 * Examples: 2499 → 2199; 199 → 175.12
 */
export function lowerPriceDeterministic(price: number): number {
  if (price <= 0) {
    return price;
  }

  const reduced = price * 0.88;

  if (price >= 100) {
    const candidate = Math.floor(reduced / 100) * 100 + 99;
    if (candidate > 0 && candidate < price) {
      return candidate;
    }
  }

  const rounded = Math.round(reduced * 100) / 100;
  if (rounded < price) {
    return rounded;
  }

  return Math.max(0, Math.round(price * 0.8 * 100) / 100);
}

/**
 * @deprecated Prefer selectRecommendation. Kept for narrow legacy callers.
 */
export function resolveRecommendationType(input: {
  barrierLabel: string | null;
  averagePriceAcceptance: number;
  averageTrust: number;
  averageUnderstanding: number;
  topArchetypeName: string | null;
  respondingCustomers: number;
}): RecommendationType {
  return selectRecommendation({
    respondingCustomers: input.respondingCustomers,
    overallPurchaseIntent: 5,
    wouldBuyPercentage: 30,
    wouldConsiderPercentage: 30,
    rejectedPercentage: 40,
    averageInterest: 6,
    averageUnderstanding: input.averageUnderstanding,
    averageTrust: input.averageTrust,
    averagePriceAcceptance: input.averagePriceAcceptance,
    positiveDrivers: [],
    negativeDrivers: input.barrierLabel
      ? [{ label: input.barrierLabel, count: 40, percentage: 40 }]
      : [],
    archetypes: input.topArchetypeName
      ? [
          {
            name: input.topArchetypeName,
            customers: 10,
            purchaseIntent: 8,
          },
        ]
      : [],
    product: null,
  }).type;
}

function canSafelyApply(
  type: RecommendationType,
  product: ProductSnapshot,
): { canApply: boolean; reason: string | null } {
  if (type === "NO_CLEAR_VARIANT") {
    return {
      canApply: false,
      reason:
        "The current results do not point strongly enough toward one specific change to justify an automated variant.",
    };
  }

  const corpus = productCorpus(product);

  if (type === "EMPHASISE_SUSTAINABILITY") {
    if (
      !hasAny(corpus, [
        /\bwaste\b/,
        /\bsustain/,
        /\benvironment/,
        /\beco\b/,
        /\bgreen\b/,
        /\bcarbon\b/,
        /\bfood-waste\b/,
        /\bfood waste\b/,
      ])
    ) {
      return {
        canApply: false,
        reason:
          "Arnabela cannot safely emphasise sustainability without existing sustainability-related information in this concept.",
      };
    }
  }

  if (type === "EMPHASISE_FAMILY_BENEFITS") {
    if (
      !hasAny(corpus, [
        /\bfamily\b/,
        /\bfamilies\b/,
        /\bhousehold\b/,
        /\bkids\b/,
        /\bchildren\b/,
        /\bparent/,
        /\bhome\b/,
      ])
    ) {
      return {
        canApply: false,
        reason:
          "Arnabela cannot safely emphasise family benefits without family-relevant information already present in this concept.",
      };
    }
  }

  return { canApply: true, reason: null };
}

function leadWith(description: string, lead: string) {
  const trimmed = description.trim();
  if (!trimmed) {
    return lead;
  }

  if (trimmed.startsWith(lead)) {
    return trimmed;
  }

  return `${lead} ${trimmed}`;
}

function buildVariantInput(
  type: RecommendationType,
  product: ProductSnapshot,
  barrierLabel: string | null,
  focusLabel: string | null = null,
): ProductSnapshot {
  const barrier = barrierLabel?.trim() || "the strongest observed barrier";
  const focus = focusLabel?.trim();
  const features = [...(product.keyFeatures ?? [])];

  switch (type) {
    case "LOWER_PRICE":
      return {
        ...product,
        keyFeatures: features,
        price: lowerPriceDeterministic(product.price),
      };

    case "STRONGER_PROOF":
      return {
        ...product,
        keyFeatures: features,
        description: leadWith(
          product.description,
          "See how it works before you commit:",
        ) + `\n\nThis version emphasises verifiable behaviour — what customers can check for themselves and how the system behaves when uncertain — addressing "${barrier}". It does not invent testimonials, studies, certifications, or performance statistics.`,
      };

    case "STRENGTHEN_TRUST":
      return {
        ...product,
        keyFeatures: features,
        description: leadWith(
          product.description,
          "Built to be understandable and dependable:",
        ) + `\n\nThis version clarifies reliability expectations and transparent limitations using only information already implied by the concept — addressing "${barrier}". It does not invent certifications, reviews, or guarantees.`,
      };

    case "REDUCE_PERCEIVED_RISK":
      return {
        ...product,
        keyFeatures: features,
        description: leadWith(
          product.description,
          "Designed to make adoption feel clearer and lower-risk:",
        ) + `\n\nThis version clarifies what the product does and does not do before asking for commitment — addressing "${barrier}". It does not invent warranties, return policies, or outcome guarantees.`,
      };

    case "CLARIFY_BENEFITS":
      return {
        ...product,
        keyFeatures: features,
        description: leadWith(
          product.description,
          "In plain terms, this product helps with a clearer everyday outcome:",
        ),
      };

    case "STRONGER_VALUE":
      return {
        ...product,
        keyFeatures: features,
        description: leadWith(
          product.description,
          focus
            ? `The outcome that matters most here is ${focus}:`
            : "The practical customer outcome comes first:",
        ) + `\n\nThis version leads with value already present in the concept — without inventing new capabilities.`,
      };

    case "STRENGTHEN_DIFFERENTIATION":
      return {
        ...product,
        keyFeatures: features,
        description: leadWith(
          product.description,
          "What makes this different:",
        ) + `\n\nThis version makes the existing differentiating capability more prominent — without inventing competitor claims.`,
      };

    case "EMPHASISE_CONVENIENCE":
      return {
        ...product,
        keyFeatures: features,
        description: leadWith(
          product.description,
          "Built for busy days — less everyday effort, more time back:",
        ) + `\n\nThis version leads with convenience using capabilities already described in the concept.`,
      };

    case "EMPHASISE_SUSTAINABILITY":
      return {
        ...product,
        keyFeatures: features,
        description: leadWith(
          product.description,
          "Reduce household food waste by keeping track of what you already have:",
        ) + `\n\nThis version leads with existing waste-reduction benefits already described in the concept. It does not invent environmental certifications or impact statistics.`,
      };

    case "EMPHASISE_FAMILY_BENEFITS":
      return {
        ...product,
        keyFeatures: features,
        description: leadWith(
          product.description,
          "Made for household life — help the whole family stay organised around food:",
        ) + `\n\nThis version emphasises existing household/family benefits already implied by the concept. It does not invent new family-only features.`,
      };

    case "LEAN_INTO_SEGMENT":
      return {
        ...product,
        keyFeatures: features,
        description: leadWith(
          product.description,
          focus
            ? `Positioned for ${focus}:`
            : "Positioned for the audience that responded most strongly:",
        ) + `\n\nThis version concentrates on motivations already observed in the strongest segment, using capabilities present in the concept.`,
      };

    case "NO_CLEAR_VARIANT":
      return {
        ...product,
        keyFeatures: features,
      };
  }
}

function formatMoney(value: number) {
  const rounded = Math.round(value * 100) / 100;
  const isWhole = Number.isInteger(rounded);
  return `$${rounded.toLocaleString("en-AU", {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  })}`;
}

function summariseChanges(
  original: ProductSnapshot,
  variant: ProductSnapshot,
): VariantPreview["changeSummary"] {
  const rows: VariantPreview["changeSummary"] = [
    {
      field: "Product name",
      from: original.productName,
      to: variant.productName,
      changed: original.productName !== variant.productName,
    },
    {
      field: "Description",
      from: original.description,
      to: variant.description,
      changed: original.description !== variant.description,
    },
    {
      field: "Price",
      from: formatMoney(original.price),
      to: formatMoney(variant.price),
      changed: original.price !== variant.price,
    },
    {
      field: "Target market",
      from: original.targetMarket,
      to: variant.targetMarket,
      changed: original.targetMarket !== variant.targetMarket,
    },
    {
      field: "Features",
      from: (original.keyFeatures ?? []).join(", ") || "—",
      to: (variant.keyFeatures ?? []).join(", ") || "—",
      changed:
        (original.keyFeatures ?? []).join("\n") !==
        (variant.keyFeatures ?? []).join("\n"),
    },
  ];

  return rows;
}

function changedFieldKeys(
  original: ProductSnapshot,
  variant: ProductSnapshot,
): ChangedField[] {
  const fields: ChangedField[] = [];

  if (original.productName !== variant.productName) {
    fields.push("productName");
  }
  if (original.description !== variant.description) {
    fields.push("description");
  }
  if (original.price !== variant.price) {
    fields.push("price");
  }
  if (original.targetMarket !== variant.targetMarket) {
    fields.push("targetMarket");
  }
  if (
    (original.keyFeatures ?? []).join("\n") !==
    (variant.keyFeatures ?? []).join("\n")
  ) {
    fields.push("keyFeatures");
  }

  return fields;
}

export function buildStructuredRecommendation(input: {
  type: RecommendationType;
  barrierLabel: string | null;
  reason: string;
  nextExperiment: string;
  product: ProductSnapshot;
  title?: string;
  rationale?: string;
  evidence?: RecommendationEvidence[];
  focusLabel?: string | null;
  /** When true, skip product-corpus safety (Insight time). Re-check at variant build. */
  deferProductSafety?: boolean;
}): StructuredRecommendation {
  if (input.type === "NO_CLEAR_VARIANT") {
    return {
      type: "NO_CLEAR_VARIANT",
      title: recommendationTitle("NO_CLEAR_VARIANT"),
      reason: input.reason,
      rationale: input.reason,
      nextExperiment:
        "The current simulation does not show a strong enough signal for Arnabela to recommend one specific change.",
      evidence: input.evidence ?? [],
      focusLabel: null,
      legacyKind: "none",
      canApply: false,
      applyBlockReason:
        "The current simulation does not show a strong enough signal for Arnabela to recommend one specific change.",
    };
  }

  const safety = input.deferProductSafety
    ? { canApply: true, reason: null }
    : canSafelyApply(input.type, input.product);

  if (!safety.canApply) {
    return {
      type: "NO_CLEAR_VARIANT",
      title: recommendationTitle("NO_CLEAR_VARIANT"),
      reason: safety.reason ?? input.reason,
      rationale: safety.reason ?? input.reason,
      nextExperiment:
        "The current simulation does not show a strong enough signal for Arnabela to recommend one specific change.",
      evidence: input.evidence ?? [],
      focusLabel: null,
      legacyKind: "none",
      canApply: false,
      applyBlockReason: safety.reason,
    };
  }

  return {
    type: input.type,
    title: input.title ?? recommendationTitle(input.type),
    reason: input.reason,
    rationale: input.rationale ?? input.reason,
    nextExperiment: input.nextExperiment,
    evidence: input.evidence ?? [],
    focusLabel: input.focusLabel ?? null,
    legacyKind: legacyKindFor(input.type),
    canApply: true,
    applyBlockReason: null,
  };
}

export function buildVariantPreview(input: {
  recommendation: StructuredRecommendation;
  product: ProductSnapshot;
  barrierLabel: string | null;
  parentTestId?: string | null;
}): VariantPreview {
  const original: ProductSnapshot = {
    productName: input.product.productName,
    testType: input.product.testType,
    description: input.product.description,
    price: input.product.price,
    targetMarket: input.product.targetMarket,
    keyFeatures: [...(input.product.keyFeatures ?? [])],
  };

  const variant = input.recommendation.canApply
    ? buildVariantInput(
        input.recommendation.type,
        original,
        input.barrierLabel,
        input.recommendation.focusLabel,
      )
    : { ...original, keyFeatures: [...original.keyFeatures] };

  return {
    recommendation: input.recommendation,
    parentTestId: input.parentTestId ?? null,
    original,
    variant,
    changedFields: changedFieldKeys(original, variant),
    changeSummary: summariseChanges(original, variant),
  };
}

/** Map legacy Insight kinds (used until Insight embeds structured types). */
export function recommendationTypeFromLegacyKind(
  kind: NextExperimentKind,
  barrierLabel: string | null,
): RecommendationType {
  if (kind === "none") {
    return "NO_CLEAR_VARIANT";
  }

  if (kind === "price") {
    return "LOWER_PRICE";
  }

  if (kind === "trust") {
    return resolveRecommendationType({
      barrierLabel,
      averagePriceAcceptance: 10,
      averageTrust: 3,
      averageUnderstanding: 10,
      topArchetypeName: null,
      respondingCustomers: 1,
    });
  }

  if (kind === "clarity") {
    return "CLARIFY_BENEFITS";
  }

  if (kind === "segment") {
    return resolveRecommendationType({
      barrierLabel,
      averagePriceAcceptance: 10,
      averageTrust: 10,
      averageUnderstanding: 10,
      topArchetypeName: barrierLabel,
      respondingCustomers: 1,
    });
  }

  return "STRONGER_VALUE";
}

export function buildVariantFromInsight(
  product: ProductSnapshot,
  insight: ArnabelaInsight,
  options?: { parentTestId?: string | null; barrierLabel?: string | null },
): VariantPreview {
  const barrierLabel =
    options?.barrierLabel ??
    extractBarrierLabel(insight.barrier) ??
    null;

  const existing = insight.recommendation;
  const provisionalType =
    existing?.type ??
    recommendationTypeFromLegacyKind(
      insight.nextExperimentKind,
      barrierLabel,
    );

  const recommendation = buildStructuredRecommendation({
    type: provisionalType,
    barrierLabel,
    reason: existing?.reason ?? insight.barrier,
    rationale: existing?.rationale ?? existing?.reason ?? insight.barrier,
    title: existing?.title,
    nextExperiment:
      existing?.nextExperiment ?? insight.nextExperiment,
    evidence: existing?.evidence ?? [],
    focusLabel: existing?.focusLabel ?? null,
    product,
  });

  return buildVariantPreview({
    recommendation,
    product,
    barrierLabel,
    parentTestId: options?.parentTestId ?? null,
  });
}

function extractBarrierLabel(barrierText: string): string | null {
  const match = barrierText.match(/"([^"]+)"/);
  return match?.[1] ?? null;
}

const FABRICATED_CLAIM_PATTERN =
  /\b(9 out of 10|independently tested|certified|certification|clinical|testimonial|★★★★★|star review|guaranteed to|warranty included|money[- ]back)\b/i;

export function containsFabricatedClaimLanguage(text: string) {
  return FABRICATED_CLAIM_PATTERN.test(text);
}
