/**
 * Multi-signal recommendation scoring engine.
 *
 * Deterministic: same InsightInput → same ranked candidates → same winner.
 * Does not invent facts. Does not use randomness.
 * Scores are internal decision aids and are not shown to users.
 */

export type DriverSignal = {
  label: string;
  count: number;
  percentage: number;
};

export type ArchetypeSignal = {
  name: string;
  customers: number;
  purchaseIntent: number;
};

export type ProductSignal = {
  productName: string;
  description: string;
  price: number;
  targetMarket: string;
  keyFeatures: string[];
};

export type RecommendationType =
  | "LOWER_PRICE"
  | "STRONGER_PROOF"
  | "STRONGER_VALUE"
  | "CLARIFY_BENEFITS"
  | "STRENGTHEN_TRUST"
  | "STRENGTHEN_DIFFERENTIATION"
  | "EMPHASISE_CONVENIENCE"
  | "EMPHASISE_SUSTAINABILITY"
  | "EMPHASISE_FAMILY_BENEFITS"
  | "LEAN_INTO_SEGMENT"
  | "REDUCE_PERCEIVED_RISK"
  | "NO_CLEAR_VARIANT";

export type RecommendationEvidence = {
  metric: string;
  label: string;
  value: string;
};

export type ScoredRecommendationCandidate = {
  type: RecommendationType;
  score: number;
  title: string;
  rationale: string;
  nextExperiment: string;
  evidence: RecommendationEvidence[];
  focusLabel: string | null;
};

export type RecommendationEngineInput = {
  respondingCustomers: number;
  overallPurchaseIntent: number;
  wouldBuyPercentage: number;
  wouldConsiderPercentage: number;
  rejectedPercentage: number;
  averageInterest: number;
  averageUnderstanding: number;
  averageTrust: number;
  averagePriceAcceptance: number;
  positiveDrivers: DriverSignal[];
  negativeDrivers: DriverSignal[];
  archetypes: ArchetypeSignal[];
  product?: ProductSignal | null;
};

/** Minimum winning score required to recommend a concrete experiment. */
export const MIN_RECOMMENDATION_SCORE = 24;

const TYPE_TIEBREAK: RecommendationType[] = [
  "LOWER_PRICE",
  "STRONGER_PROOF",
  "CLARIFY_BENEFITS",
  "STRENGTHEN_DIFFERENTIATION",
  "EMPHASISE_CONVENIENCE",
  "EMPHASISE_SUSTAINABILITY",
  "EMPHASISE_FAMILY_BENEFITS",
  "LEAN_INTO_SEGMENT",
  "REDUCE_PERCEIVED_RISK",
  "STRENGTHEN_TRUST",
  "STRONGER_VALUE",
  "NO_CLEAR_VARIANT",
];

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function evidence(
  metric: string,
  label: string,
  value: string | number,
): RecommendationEvidence {
  return {
    metric,
    label,
    value: typeof value === "number" ? String(value) : value,
  };
}

function matchesTheme(label: string, patterns: RegExp[]) {
  const text = label.toLowerCase();
  return patterns.some((pattern) => pattern.test(text));
}

function themeRate(drivers: DriverSignal[], patterns: RegExp[]) {
  let best = 0;
  let matched: DriverSignal | null = null;

  for (const driver of drivers) {
    if (matchesTheme(driver.label, patterns) && driver.percentage >= best) {
      best = driver.percentage;
      matched = driver;
    }
  }

  return { rate: best, driver: matched };
}

function sumThemeRate(drivers: DriverSignal[], patterns: RegExp[]) {
  const seen = new Set<string>();
  let total = 0;

  for (const driver of drivers) {
    const key = driver.label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    if (matchesTheme(driver.label, patterns)) {
      seen.add(key);
      total += driver.percentage;
    }
  }

  return Math.min(100, total);
}

function findArchetype(
  archetypes: ArchetypeSignal[],
  patterns: RegExp[],
) {
  return (
    archetypes.find((item) =>
      patterns.some((pattern) => pattern.test(item.name.toLowerCase())),
    ) ?? null
  );
}

function usableArchetypes(archetypes: ArchetypeSignal[]) {
  return archetypes.filter(
    (item) =>
      item.name !== "Simulated Customer" && item.customers > 0,
  );
}

const PRICE_PATTERNS = [
  /\b(price|priced|cost|costs|expensive|afford|affordable|cheap|fee|fees|too high)\b/,
];
const PROOF_PATTERNS = [
  /\b(proof|prove|evidence|demonstrate|works|actually work)\b/,
];
const TRUST_PATTERNS = [
  /\b(trust|believ|reputat|support|credible|credibility)\b/,
];
const CLARITY_PATTERNS = [
  /\b(understand|understanding|unclear|confus|explain|complicat|what it does|information|more info|details|how it works)\b/,
];
const RISK_PATTERNS = [
  /\b(risk|risky|uncertain|uncertainty|complex|complexity|commitment|switching|adoption)\b/,
];
const DIFF_PATTERNS = [
  /\b(compar|alternative|alternatives|competitor|competitors|differentiat|why (this|it) is better)\b/,
];
const CONVENIENCE_PATTERNS = [
  /\b(convenien|easy to use|hassle|time-saving|saves time|busy|quick|simplify|effort)\b/,
];
const SUSTAIN_PATTERNS = [
  /\b(sustain|waste|environment|eco|green|carbon|food-waste|food waste)\b/,
];
const FAMILY_PATTERNS = [
  /\b(family|families|household|kids|children|parent|parents)\b/,
];
const VALUE_PATTERNS = [
  /\b(value|worth|not worth|benefit|benefits|roi|return)\b/,
];
const TECH_PATTERNS = [
  /\b(ai|artificial intelligence|camera|cameras|technology|tech|smart|algorithm)\b/,
];

function productCorpus(product: ProductSignal | null | undefined) {
  if (!product) {
    return "";
  }

  return [
    product.productName,
    product.description,
    product.targetMarket,
    ...(product.keyFeatures ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function strongestPositiveTheme(
  positives: DriverSignal[],
): { label: string; percentage: number } | null {
  const themes: Array<{ label: string; patterns: RegExp[]; name: string }> = [
    { name: "convenience", label: "convenience", patterns: CONVENIENCE_PATTERNS },
    {
      name: "food-waste reduction",
      label: "food-waste reduction",
      patterns: SUSTAIN_PATTERNS,
    },
    { name: "family utility", label: "family utility", patterns: FAMILY_PATTERNS },
  ];

  let best: { label: string; percentage: number } | null = null;

  for (const theme of themes) {
    const { rate, driver } = themeRate(positives, theme.patterns);
    if (rate >= 18 && (!best || rate > best.percentage)) {
      best = {
        label: driver?.label ?? theme.label,
        percentage: rate,
      };
    }
  }

  if (!best && positives[0] && positives[0].percentage >= 20) {
    return {
      label: positives[0].label,
      percentage: positives[0].percentage,
    };
  }

  return best;
}

function scorePrice(input: RecommendationEngineInput): ScoredRecommendationCandidate {
  const priceNeg = themeRate(input.negativeDrivers, PRICE_PATTERNS);
  const priceSum = sumThemeRate(input.negativeDrivers, PRICE_PATTERNS);
  const budget = findArchetype(input.archetypes, [
    /\bbudget\b/,
    /\bprice[- ]?sensitive\b/,
  ]);
  const gap = input.averageInterest - input.overallPurchaseIntent;
  const evidenceItems: RecommendationEvidence[] = [
    evidence(
      "price_acceptance",
      "Average price acceptance",
      `${roundOne(input.averagePriceAcceptance)}/10`,
    ),
  ];

  let score = 0;

  if (input.averagePriceAcceptance <= 5.5) {
    score += (5.5 - input.averagePriceAcceptance) * 14;
  }

  score += priceNeg.rate * 0.45;
  score += Math.min(25, priceSum * 0.15);

  if (gap >= 1.5 && input.averagePriceAcceptance < 6) {
    score += 16;
    evidenceItems.push(
      evidence(
        "interest_purchase_gap",
        "Interest vs purchase intent gap",
        `${roundOne(gap)} points`,
      ),
    );
  }

  if (budget && budget.purchaseIntent <= 4) {
    score += 14;
    evidenceItems.push(
      evidence(
        "budget_segment_intent",
        `${budget.name} purchase intent`,
        `${roundOne(budget.purchaseIntent)}/10`,
      ),
    );
  }

  if (priceNeg.driver) {
    evidenceItems.push(
      evidence(
        "price_objection_rate",
        `"${priceNeg.driver.label}" cited`,
        `${priceNeg.driver.percentage}%`,
      ),
    );
  }

  // Expensive alone is not enough.
  if (
    input.averagePriceAcceptance >= 7 ||
    (priceNeg.rate < 12 && input.averagePriceAcceptance >= 5.8)
  ) {
    score *= 0.15;
  }

  // If trust is clearly the weaker score, soften price lead.
  if (
    input.averageTrust <= 4.5 &&
    input.averageTrust + 1.2 < input.averagePriceAcceptance
  ) {
    score *= 0.55;
  }

  return {
    type: "LOWER_PRICE",
    score: roundOne(score),
    title: "Test a lower price",
    rationale:
      "Price pressure appears in acceptance scores and objections, so a controlled price experiment is the clearest next test.",
    nextExperiment:
      "Test whether a lower price converts the same audience while keeping the proposition otherwise identical.",
    evidence: evidenceItems,
    focusLabel: "price",
  };
}

function scoreProof(input: RecommendationEngineInput): ScoredRecommendationCandidate {
  const proofNeg = themeRate(input.negativeDrivers, PROOF_PATTERNS);
  const gap = input.averageInterest - input.overallPurchaseIntent;
  const evidenceItems: RecommendationEvidence[] = [
    evidence(
      "trust",
      "Average trust",
      `${roundOne(input.averageTrust)}/10`,
    ),
  ];

  let score = 0;

  if (input.averageTrust < 6) {
    score += (6 - input.averageTrust) * 13;
  }

  score += proofNeg.rate * 0.55;

  if (
    gap >= 1.2 &&
    input.averageTrust + 0.8 < input.averageInterest
  ) {
    score += 12;
    evidenceItems.push(
      evidence(
        "interest_purchase_gap",
        "Interest vs purchase intent gap",
        `${roundOne(gap)} points`,
      ),
    );
  }

  if (proofNeg.driver) {
    evidenceItems.push(
      evidence(
        "proof_objection_rate",
        `"${proofNeg.driver.label}" cited`,
        `${proofNeg.driver.percentage}%`,
      ),
    );
  }

  // Critical: do not recommend proof when trust is already strong.
  if (input.averageTrust >= 7.5) {
    score *= 0.08;
  } else if (input.averageTrust >= 7) {
    score *= 0.35;
  }

  return {
    type: "STRONGER_PROOF",
    score: roundOne(score),
    title: "Make reliability easier to verify",
    rationale:
      "Trust/proof signals are weaker than interest, so the most useful experiment is clarifying how the product works without inventing evidence.",
    nextExperiment:
      "Test a proposition that makes how the product works easier to verify, using only information already in the concept.",
    evidence: evidenceItems,
    focusLabel: "proof",
  };
}

function scoreTrust(input: RecommendationEngineInput): ScoredRecommendationCandidate {
  const trustNeg = themeRate(input.negativeDrivers, TRUST_PATTERNS);
  const proofNeg = themeRate(input.negativeDrivers, PROOF_PATTERNS);
  const evidenceItems: RecommendationEvidence[] = [
    evidence(
      "trust",
      "Average trust",
      `${roundOne(input.averageTrust)}/10`,
    ),
  ];

  let score = 0;

  if (input.averageTrust < 5.5 && proofNeg.rate < 15) {
    score += (5.5 - input.averageTrust) * 12;
    score += trustNeg.rate * 0.4;
  }

  if (input.averageTrust >= 7) {
    score *= 0.1;
  }

  if (trustNeg.driver) {
    evidenceItems.push(
      evidence(
        "trust_objection_rate",
        `"${trustNeg.driver.label}" cited`,
        `${trustNeg.driver.percentage}%`,
      ),
    );
  }

  return {
    type: "STRENGTHEN_TRUST",
    score: roundOne(score),
    title: "Strengthen trust before asking for the sale",
    rationale:
      "Trust is materially lower than other scores, so clarifying reliability and transparency is the most relevant intervention.",
    nextExperiment:
      "Test trust-oriented messaging that clarifies reliability expectations using only information already implied by the concept.",
    evidence: evidenceItems,
    focusLabel: "trust",
  };
}

function scoreClarity(input: RecommendationEngineInput): ScoredRecommendationCandidate {
  const clarityNeg = themeRate(input.negativeDrivers, CLARITY_PATTERNS);
  const understandingGap =
    input.averageInterest - input.averageUnderstanding;
  const evidenceItems: RecommendationEvidence[] = [
    evidence(
      "understanding",
      "Average understanding",
      `${roundOne(input.averageUnderstanding)}/10`,
    ),
  ];

  let score = 0;

  if (input.averageUnderstanding < 6) {
    score += (6 - input.averageUnderstanding) * 14;
  }

  score += clarityNeg.rate * 0.5;

  if (understandingGap >= 1.5) {
    score += 15;
    evidenceItems.push(
      evidence(
        "interest_understanding_gap",
        "Interest vs understanding gap",
        `${roundOne(understandingGap)} points`,
      ),
    );
  }

  if (clarityNeg.driver) {
    evidenceItems.push(
      evidence(
        "clarity_objection_rate",
        `"${clarityNeg.driver.label}" cited`,
        `${clarityNeg.driver.percentage}%`,
      ),
    );
  }

  if (input.averageUnderstanding >= 7.5) {
    score *= 0.12;
  }

  return {
    type: "CLARIFY_BENEFITS",
    score: roundOne(score),
    title: "Clarify how it works",
    rationale:
      "Understanding lags interest, so the most useful next experiment is a clearer explanation of the existing proposition.",
    nextExperiment:
      "Test a clearer explanation of what the product does, who it is for, and what changes after purchase — without adding fictional features.",
    evidence: evidenceItems,
    focusLabel: "clarity",
  };
}

function scoreValue(input: RecommendationEngineInput): ScoredRecommendationCandidate {
  const valueNeg = themeRate(input.negativeDrivers, VALUE_PATTERNS);
  const positiveTheme = strongestPositiveTheme(input.positiveDrivers);
  const gap = input.averageInterest - input.overallPurchaseIntent;
  const evidenceItems: RecommendationEvidence[] = [
    evidence(
      "purchase_intent",
      "Average purchase intent",
      `${roundOne(input.overallPurchaseIntent)}/10`,
    ),
    evidence(
      "understanding",
      "Average understanding",
      `${roundOne(input.averageUnderstanding)}/10`,
    ),
  ];

  let score = 0;

  if (
    input.averageUnderstanding >= 6.5 &&
    input.averageTrust >= 6 &&
    input.overallPurchaseIntent <= 5.5
  ) {
    score += 26;
  }

  if (gap >= 1.8) {
    score += 12;
    evidenceItems.push(
      evidence(
        "interest_purchase_gap",
        "Interest vs purchase intent gap",
        `${roundOne(gap)} points`,
      ),
    );
  }

  score += valueNeg.rate * 0.35;

  if (positiveTheme) {
    evidenceItems.push(
      evidence(
        "strongest_pull",
        "Strongest observed pull",
        `${positiveTheme.label} (${positiveTheme.percentage}%)`,
      ),
    );
    score += 6;
  }

  return {
    type: "STRONGER_VALUE",
    score: roundOne(score),
    title: positiveTheme
      ? `Lead with ${positiveTheme.label.toLowerCase()}`
      : "Strengthen the value proposition",
    rationale:
      "Customers appear to understand the idea, but purchase intent is weaker than understanding/trust — a value-led repositioning is the most useful test.",
    nextExperiment: positiveTheme
      ? `Test a Version 2 that leads with "${positiveTheme.label}" using benefits already present in the concept.`
      : "Test a tighter value proposition that leads with the strongest observed customer outcome.",
    evidence: evidenceItems,
    focusLabel: positiveTheme?.label ?? "value",
  };
}

function scoreDifferentiation(
  input: RecommendationEngineInput,
): ScoredRecommendationCandidate {
  const diffNeg = themeRate(input.negativeDrivers, DIFF_PATTERNS);
  const evidenceItems: RecommendationEvidence[] = [];

  let score = diffNeg.rate * 0.7;

  if (
    diffNeg.rate >= 18 &&
    input.averageUnderstanding >= 6 &&
    input.averageTrust >= 6
  ) {
    score += 14;
  }

  if (diffNeg.driver) {
    evidenceItems.push(
      evidence(
        "differentiation_objection_rate",
        `"${diffNeg.driver.label}" cited`,
        `${diffNeg.driver.percentage}%`,
      ),
    );
  }

  evidenceItems.push(
    evidence(
      "understanding",
      "Average understanding",
      `${roundOne(input.averageUnderstanding)}/10`,
    ),
  );

  return {
    type: "STRENGTHEN_DIFFERENTIATION",
    score: roundOne(score),
    title: "Make the differentiator clearer",
    rationale:
      "Customers understand the idea but frequently signal comparison pressure, so the useful experiment is sharpening existing differentiation.",
    nextExperiment:
      "Test a Version 2 that makes the existing differentiating capability more prominent — without inventing competitor claims.",
    evidence: evidenceItems,
    focusLabel: "differentiation",
  };
}

function scoreConvenience(
  input: RecommendationEngineInput,
): ScoredRecommendationCandidate {
  const conveniencePos = themeRate(
    input.positiveDrivers,
    CONVENIENCE_PATTERNS,
  );
  const corpus = productCorpus(input.product);
  const targetBusy = /\b(busy|professional|professionals|time-poor)\b/.test(
    corpus,
  );
  const techHeavy = matchesTheme(corpus, TECH_PATTERNS);
  const convenienceSegment = findArchetype(input.archetypes, [
    /\bconvenience\b/,
  ]);
  const evidenceItems: RecommendationEvidence[] = [];

  let score = conveniencePos.rate * 0.55;

  if (conveniencePos.driver) {
    evidenceItems.push(
      evidence(
        "convenience_pull",
        `"${conveniencePos.driver.label}" cited`,
        `${conveniencePos.driver.percentage}%`,
      ),
    );
  }

  if (targetBusy) {
    score += 12;
    evidenceItems.push(
      evidence("target_market", "Target market cue", "Busy / professional"),
    );
  }

  if (techHeavy && conveniencePos.rate >= 15) {
    score += 18;
    evidenceItems.push(
      evidence(
        "positioning_mismatch",
        "Positioning mismatch",
        "Description leads with technology while convenience is a strong pull",
      ),
    );
  }

  if (convenienceSegment && convenienceSegment.purchaseIntent >= 7) {
    score += 10;
    evidenceItems.push(
      evidence(
        "convenience_segment_intent",
        `${convenienceSegment.name} purchase intent`,
        `${roundOne(convenienceSegment.purchaseIntent)}/10`,
      ),
    );
  }

  return {
    type: "EMPHASISE_CONVENIENCE",
    score: roundOne(score),
    title: "Lead with convenience",
    rationale:
      "Convenience is a strong observed pull, and the current framing under-emphasises time-saving outcomes relative to that signal.",
    nextExperiment:
      "Test a convenience-led Version 2 that reorders the existing description toward saving time and reducing everyday effort.",
    evidence: evidenceItems,
    focusLabel: "convenience",
  };
}

function scoreSustainability(
  input: RecommendationEngineInput,
): ScoredRecommendationCandidate {
  const sustainPos = themeRate(input.positiveDrivers, SUSTAIN_PATTERNS);
  const corpus = productCorpus(input.product);
  const hasSustainLanguage = matchesTheme(corpus, SUSTAIN_PATTERNS);
  const sustainSegment = findArchetype(input.archetypes, [
    /\bsustain/,
    /\beco\b/,
    /\benvironment/,
    /\bgreen\b/,
  ]);
  const evidenceItems: RecommendationEvidence[] = [];

  let score = sustainPos.rate * 0.6;

  if (sustainPos.driver) {
    evidenceItems.push(
      evidence(
        "sustainability_pull",
        `"${sustainPos.driver.label}" cited`,
        `${sustainPos.driver.percentage}%`,
      ),
    );
  }

  if (sustainSegment && sustainSegment.purchaseIntent >= 7) {
    score += 16;
    evidenceItems.push(
      evidence(
        "sustainability_segment_intent",
        `${sustainSegment.name} purchase intent`,
        `${roundOne(sustainSegment.purchaseIntent)}/10`,
      ),
    );
  }

  if (hasSustainLanguage) {
    score += 10;
    evidenceItems.push(
      evidence(
        "concept_support",
        "Concept already includes",
        "Waste / sustainability language",
      ),
    );
  } else {
    score *= 0.25;
  }

  return {
    type: "EMPHASISE_SUSTAINABILITY",
    score: roundOne(score),
    title: "Put food-waste reduction first",
    rationale:
      "Sustainability / waste-reduction signals are strong enough to justify a positioning experiment that leads with those existing benefits.",
    nextExperiment:
      "Test a Version 2 that leads with existing waste-reduction or sustainability benefits already described in the concept.",
    evidence: evidenceItems,
    focusLabel: "food-waste reduction",
  };
}

function scoreFamily(
  input: RecommendationEngineInput,
): ScoredRecommendationCandidate {
  const familySegment = findArchetype(input.archetypes, FAMILY_PATTERNS);
  const corpus = productCorpus(input.product);
  const targetMentionsFamily = matchesTheme(corpus, FAMILY_PATTERNS);
  const overall = input.overallPurchaseIntent;
  const evidenceItems: RecommendationEvidence[] = [];

  let score = 0;

  if (familySegment) {
    evidenceItems.push(
      evidence(
        "family_segment_intent",
        `${familySegment.name} purchase intent`,
        `${roundOne(familySegment.purchaseIntent)}/10`,
      ),
    );

    if (targetMentionsFamily && familySegment.purchaseIntent + 1.5 < overall) {
      score += 28;
      evidenceItems.push(
        evidence(
          "target_gap",
          "Target market includes families, but family response lags",
          `${roundOne(overall - familySegment.purchaseIntent)} pts behind overall`,
        ),
      );
    } else if (familySegment.purchaseIntent >= overall + 1.5) {
      score += 18;
    }
  } else if (targetMentionsFamily) {
    score += 8;
  }

  if (!matchesTheme(corpus, FAMILY_PATTERNS) && !familySegment) {
    score *= 0.2;
  }

  return {
    type: "EMPHASISE_FAMILY_BENEFITS",
    score: roundOne(score),
    title: "Test a family-first proposition",
    rationale:
      "Family relevance is part of the opportunity set, so a family-first positioning experiment is a concrete next test.",
    nextExperiment:
      "Test a Version 2 that emphasises existing household/family benefits already implied by the concept.",
    evidence: evidenceItems,
    focusLabel: "family benefits",
  };
}

function scoreLeanIntoSegment(
  input: RecommendationEngineInput,
): ScoredRecommendationCandidate {
  const archetypes = usableArchetypes(input.archetypes).sort(
    (left, right) => right.purchaseIntent - left.purchaseIntent,
  );
  const top = archetypes[0] ?? null;
  const evidenceItems: RecommendationEvidence[] = [];

  let score = 0;

  if (top && top.purchaseIntent >= 7) {
    const gap = top.purchaseIntent - input.overallPurchaseIntent;
    if (gap >= 1.8) {
      score += 20 + gap * 4;
      evidenceItems.push(
        evidence(
          "top_segment_intent",
          `${top.name} purchase intent`,
          `${roundOne(top.purchaseIntent)}/10`,
        ),
        evidence(
          "segment_overall_gap",
          "Gap vs overall purchase intent",
          `${roundOne(gap)} points`,
        ),
      );
    }
  }

  // Prefer specific positioning plays when they already score well.
  if (top && /\bconvenience\b/.test(top.name.toLowerCase())) {
    score *= 0.7;
  }
  if (top && matchesTheme(top.name, FAMILY_PATTERNS)) {
    score *= 0.7;
  }
  if (top && matchesTheme(top.name, SUSTAIN_PATTERNS)) {
    score *= 0.7;
  }

  const title = top
    ? `Lean into ${top.name}`
    : "Lean into the strongest segment";

  return {
    type: "LEAN_INTO_SEGMENT",
    score: roundOne(score),
    title,
    rationale: top
      ? `${top.name} responded materially more strongly than the overall audience, so concentrating the proposition is a high-value experiment.`
      : "One segment clearly outperformed the overall audience.",
    nextExperiment: top
      ? `Test a Version 2 focused on the motivations of ${top.name}, using capabilities already present in the concept.`
      : "Test a Version 2 focused on the strongest-performing segment observed in this test.",
    evidence: evidenceItems,
    focusLabel: top?.name ?? "strongest segment",
  };
}

function scoreRisk(input: RecommendationEngineInput): ScoredRecommendationCandidate {
  const riskNeg = themeRate(input.negativeDrivers, RISK_PATTERNS);
  const riskSegment = findArchetype(input.archetypes, [
    /\brisk[- ]?averse\b/,
    /\bskeptic/,
    /\bresearcher\b/,
  ]);
  const evidenceItems: RecommendationEvidence[] = [
    evidence(
      "trust",
      "Average trust",
      `${roundOne(input.averageTrust)}/10`,
    ),
  ];

  let score = riskNeg.rate * 0.55;

  if (input.averageTrust <= 5.5) {
    score += (5.5 - input.averageTrust) * 8;
  }

  if (riskSegment && riskSegment.purchaseIntent <= 4) {
    score += 12;
    evidenceItems.push(
      evidence(
        "risk_segment_intent",
        `${riskSegment.name} purchase intent`,
        `${roundOne(riskSegment.purchaseIntent)}/10`,
      ),
    );
  }

  if (riskNeg.driver) {
    evidenceItems.push(
      evidence(
        "risk_objection_rate",
        `"${riskNeg.driver.label}" cited`,
        `${riskNeg.driver.percentage}%`,
      ),
    );
  }

  return {
    type: "REDUCE_PERCEIVED_RISK",
    score: roundOne(score),
    title: "Reduce adoption risk",
    rationale:
      "Risk-sensitive responses are limiting conversion, so clarifying adoption expectations is a useful controlled experiment.",
    nextExperiment:
      "Test a Version 2 that clarifies what the product does and does not do, using only information already in the concept — without inventing guarantees.",
    evidence: evidenceItems,
    focusLabel: "adoption risk",
  };
}

export function scoreRecommendationCandidates(
  input: RecommendationEngineInput,
): ScoredRecommendationCandidate[] {
  if (input.respondingCustomers <= 0) {
    return [];
  }

  const candidates = [
    scorePrice(input),
    scoreProof(input),
    scoreTrust(input),
    scoreClarity(input),
    scoreValue(input),
    scoreDifferentiation(input),
    scoreConvenience(input),
    scoreSustainability(input),
    scoreFamily(input),
    scoreLeanIntoSegment(input),
    scoreRisk(input),
  ];

  return candidates.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return (
      TYPE_TIEBREAK.indexOf(left.type) - TYPE_TIEBREAK.indexOf(right.type)
    );
  });
}

export function selectRecommendation(
  input: RecommendationEngineInput,
): ScoredRecommendationCandidate {
  const ranked = scoreRecommendationCandidates(input);
  const winner = ranked[0];

  if (!winner || winner.score < MIN_RECOMMENDATION_SCORE) {
    return {
      type: "NO_CLEAR_VARIANT",
      score: winner?.score ?? 0,
      title: "No clear next experiment",
      rationale:
        "The current simulation does not show a strong enough signal for Arnabela to recommend one specific change.",
      nextExperiment:
        "The current simulation does not show a strong enough signal for Arnabela to recommend one specific change.",
      evidence: winner?.evidence ?? [],
      focusLabel: null,
    };
  }

  return winner;
}
