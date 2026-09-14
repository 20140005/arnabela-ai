import type {
  CustomerProfile,
  CustomerResponse,
  StoredSimulation,
} from "./simulationClient";

export type DecisionLabel = "BUY" | "CONSIDER" | "REJECT";

export type AggregateSplit = {
  completed: number;
  buyCount: number;
  considerCount: number;
  rejectCount: number;
  buyPercentage: number;
  considerPercentage: number;
  rejectPercentage: number;
  averagePurchaseIntent: number;
};

export type PercentagePointDelta = {
  from: number;
  to: number;
  points: number;
};

export type DecisionTransition = {
  from: DecisionLabel;
  to: DecisionLabel;
  count: number;
};

export type CustomerMovementRow = {
  customerId: string;
  name: string;
  archetype: string;
  from: DecisionLabel;
  to: DecisionLabel;
  fromIntent: number;
  toIntent: number;
  changed: boolean;
  direction: "improved" | "worsened" | "same";
};

export type SegmentMovement = {
  name: string;
  customers: number;
  fromIntent: number;
  toIntent: number;
  deltaPoints: number;
};

export type DriverDelta = {
  label: string;
  fromPercentage: number;
  toPercentage: number;
  deltaPoints: number;
};

export type RecommendationOutcome = {
  status: "improved" | "mixed" | "no_clear_improvement";
  headline: string;
  explanation: string;
};

export type ComparisonResult = {
  comparableCustomers: number;
  requestedCustomers: number;
  originalCompleted: number;
  variantCompleted: number;
  original: AggregateSplit;
  variant: AggregateSplit;
  buyDelta: PercentagePointDelta;
  considerDelta: PercentagePointDelta;
  rejectDelta: PercentagePointDelta;
  purchaseIntentDelta: PercentagePointDelta;
  changedDecisions: number;
  sameDecisions: number;
  improved: number;
  worsened: number;
  transitions: DecisionTransition[];
  customerMovements: CustomerMovementRow[];
  segmentMovements: SegmentMovement[];
  barrierDeltas: DriverDelta[];
  outcome: RecommendationOutcome;
};

function percentage(count: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((count / total) * 100);
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function formatMoney(value: number) {
  const rounded = Math.round(value * 100) / 100;
  const isWhole = Number.isInteger(rounded);
  return `$${rounded.toLocaleString("en-AU", {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  })}`;
}

function decisionFromResponse(response: {
  would_buy: boolean;
  would_consider: boolean;
}): DecisionLabel {
  if (response.would_buy) {
    return "BUY";
  }

  if (response.would_consider) {
    return "CONSIDER";
  }

  return "REJECT";
}

function rank(decision: DecisionLabel) {
  if (decision === "BUY") {
    return 2;
  }

  if (decision === "CONSIDER") {
    return 1;
  }

  return 0;
}

function barrierRates(responses: CustomerResponse[]) {
  const total = responses.length;
  const counts = new Map<string, { label: string; count: number }>();

  for (const response of responses) {
    const labels = new Set<string>();

    for (const factor of response.negative_factors) {
      const trimmed = factor.trim();
      if (trimmed) {
        labels.add(trimmed);
      }
    }

    const objection = response.primary_objection.trim();
    if (objection) {
      labels.add(objection);
    }

    for (const label of labels) {
      const key = label.toLowerCase();
      const existing = counts.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { label, count: 1 });
      }
    }
  }

  return [...counts.values()]
    .map((item) => ({
      label: item.label,
      percentage: percentage(item.count, total),
    }))
    .sort((left, right) => right.percentage - left.percentage);
}

export function aggregateFromResponses(
  responses: CustomerResponse[],
): AggregateSplit {
  const completed = responses.length;
  const buyCount = responses.filter((item) => item.would_buy).length;
  const considerCount = responses.filter(
    (item) => !item.would_buy && item.would_consider,
  ).length;
  const rejectCount = completed - buyCount - considerCount;
  const intentTotal = responses.reduce(
    (sum, item) => sum + item.purchase_intent,
    0,
  );

  return {
    completed,
    buyCount,
    considerCount,
    rejectCount,
    buyPercentage: percentage(buyCount, completed),
    considerPercentage: percentage(considerCount, completed),
    rejectPercentage: percentage(rejectCount, completed),
    averagePurchaseIntent:
      completed > 0 ? roundOne(intentTotal / completed) : 0,
  };
}

export function pointsDelta(from: number, to: number): PercentagePointDelta {
  return {
    from,
    to,
    points: roundOne(to - from),
  };
}

export function customerIdsFromSimulation(
  simulation: StoredSimulation,
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const response of simulation.backendResult.responses) {
    if (!seen.has(response.customer_id)) {
      seen.add(response.customer_id);
      ids.push(response.customer_id);
    }
  }

  for (const failedId of simulation.backendResult.failed_customer_ids) {
    if (!seen.has(failedId)) {
      seen.add(failedId);
      ids.push(failedId);
    }
  }

  return ids;
}

export function describeChangedFields(
  original: StoredSimulation,
  variant: {
    productName: string;
    description: string;
    price: number;
    targetMarket: string;
    keyFeatures: string[];
  },
) {
  const changes: Array<{ field: string; from: string; to: string }> = [];

  if (original.productName !== variant.productName) {
    changes.push({
      field: "Product name",
      from: original.productName,
      to: variant.productName,
    });
  }

  if (original.description !== variant.description) {
    changes.push({
      field: "Description",
      from: original.description,
      to: variant.description,
    });
  }

  if (original.price !== variant.price) {
    changes.push({
      field: "Price",
      from: formatMoney(original.price),
      to: formatMoney(variant.price),
    });
  }

  if (original.targetMarket !== variant.targetMarket) {
    changes.push({
      field: "Target market",
      from: original.targetMarket,
      to: variant.targetMarket,
    });
  }

  const originalFeatures = (original.keyFeatures ?? []).join("\n");
  const variantFeatures = variant.keyFeatures.join("\n");

  if (originalFeatures !== variantFeatures) {
    changes.push({
      field: "Key features",
      from: (original.keyFeatures ?? []).join(", ") || "—",
      to: variant.keyFeatures.join(", ") || "—",
    });
  }

  return changes;
}

function buildOutcome(
  buyDelta: PercentagePointDelta,
  rejectDelta: PercentagePointDelta,
  intentDelta: PercentagePointDelta,
  improved: number,
  worsened: number,
): RecommendationOutcome {
  const buyUp = buyDelta.points >= 3;
  const rejectDown = rejectDelta.points <= -3;
  const intentUp = intentDelta.points >= 0.3;
  const buyDown = buyDelta.points <= -3;
  const rejectUp = rejectDelta.points >= 3;
  const intentDown = intentDelta.points <= -0.3;

  if ((buyUp || intentUp) && (rejectDown || !buyDown) && improved >= worsened) {
    return {
      status: "improved",
      headline:
        "The recommended change produced a stronger simulated response.",
      explanation:
        "Across the same customer profiles, simulated purchase intent and decision quality improved. This supports the recommendation within the simulated audience — it does not prove real-world market outcomes.",
    };
  }

  if (buyDown || (intentDown && rejectUp) || worsened > improved + 5) {
    return {
      status: "no_clear_improvement",
      headline:
        "The change did not improve the main simulated outcome.",
      explanation:
        "Retesting the same audience did not produce a clearer purchase signal. The recommendation is not supported by this simulated experiment.",
    };
  }

  return {
    status: "mixed",
    headline: "The simulated response changed in mixed ways.",
    explanation:
      "Some metrics improved while others softened. The recommendation shows movement in the simulated audience, but not a clear overall uplift.",
  };
}

export function buildComparisonResult(input: {
  original: StoredSimulation;
  variant: StoredSimulation;
  profiles: CustomerProfile[];
}): ComparisonResult | null {
  const { original, variant, profiles } = input;

  if (variant.backendResult.completed_customers <= 0) {
    return null;
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.id, profile]),
  );

  const originalById = new Map(
    original.backendResult.responses.map((response) => [
      response.customer_id,
      response,
    ]),
  );
  const variantById = new Map(
    variant.backendResult.responses.map((response) => [
      response.customer_id,
      response,
    ]),
  );

  const sharedIds = [...originalById.keys()].filter((id) =>
    variantById.has(id),
  );

  if (sharedIds.length === 0) {
    return null;
  }

  const originalShared = sharedIds.map(
    (id) => originalById.get(id) as CustomerResponse,
  );
  const variantShared = sharedIds.map(
    (id) => variantById.get(id) as CustomerResponse,
  );

  const originalAgg = aggregateFromResponses(originalShared);
  const variantAgg = aggregateFromResponses(variantShared);

  const buyDelta = pointsDelta(
    originalAgg.buyPercentage,
    variantAgg.buyPercentage,
  );
  const considerDelta = pointsDelta(
    originalAgg.considerPercentage,
    variantAgg.considerPercentage,
  );
  const rejectDelta = pointsDelta(
    originalAgg.rejectPercentage,
    variantAgg.rejectPercentage,
  );
  const purchaseIntentDelta = pointsDelta(
    originalAgg.averagePurchaseIntent,
    variantAgg.averagePurchaseIntent,
  );

  const transitionCounts = new Map<string, DecisionTransition>();
  const customerMovements: CustomerMovementRow[] = [];
  let changedDecisions = 0;
  let sameDecisions = 0;
  let improved = 0;
  let worsened = 0;

  for (const id of sharedIds) {
    const before = originalById.get(id) as CustomerResponse;
    const after = variantById.get(id) as CustomerResponse;
    const from = decisionFromResponse(before);
    const to = decisionFromResponse(after);
    const key = `${from}->${to}`;
    const existing = transitionCounts.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      transitionCounts.set(key, { from, to, count: 1 });
    }

    const changed = from !== to;
    let direction: CustomerMovementRow["direction"] = "same";

    if (rank(to) > rank(from)) {
      direction = "improved";
      improved += 1;
    } else if (rank(to) < rank(from)) {
      direction = "worsened";
      worsened += 1;
    }

    if (changed) {
      changedDecisions += 1;
    } else {
      sameDecisions += 1;
    }

    const profile = profileMap.get(id);

    customerMovements.push({
      customerId: id,
      name: profile?.name ?? `Customer ${id}`,
      archetype: profile?.archetype ?? "Simulated Customer",
      from,
      to,
      fromIntent: before.purchase_intent,
      toIntent: after.purchase_intent,
      changed,
      direction,
    });
  }

  const transitions = [...transitionCounts.values()]
    .filter((item) => item.from !== item.to)
    .sort((left, right) => right.count - left.count);

  const archetypeIds = new Map<string, string[]>();

  for (const id of sharedIds) {
    const archetype =
      profileMap.get(id)?.archetype ?? "Simulated Customer";
    const list = archetypeIds.get(archetype) ?? [];
    list.push(id);
    archetypeIds.set(archetype, list);
  }

  const segmentMovements: SegmentMovement[] = [];

  for (const [name, ids] of archetypeIds.entries()) {
    if (name === "Simulated Customer" || ids.length === 0) {
      continue;
    }

    const fromIntent =
      ids.reduce(
        (sum, id) =>
          sum + (originalById.get(id)?.purchase_intent ?? 0),
        0,
      ) / ids.length;
    const toIntent =
      ids.reduce(
        (sum, id) =>
          sum + (variantById.get(id)?.purchase_intent ?? 0),
        0,
      ) / ids.length;

    segmentMovements.push({
      name,
      customers: ids.length,
      fromIntent: roundOne(fromIntent),
      toIntent: roundOne(toIntent),
      deltaPoints: roundOne(toIntent - fromIntent),
    });
  }

  segmentMovements.sort(
    (left, right) =>
      Math.abs(right.deltaPoints) - Math.abs(left.deltaPoints),
  );

  const originalBarriers = barrierRates(originalShared);
  const variantBarriers = barrierRates(variantShared);
  const barrierDeltas: DriverDelta[] = [];

  for (const originalDriver of originalBarriers.slice(0, 5)) {
    const match = variantBarriers.find(
      (item) =>
        item.label.toLowerCase() === originalDriver.label.toLowerCase(),
    );

    const toPercentage = match?.percentage ?? 0;

    barrierDeltas.push({
      label: originalDriver.label,
      fromPercentage: originalDriver.percentage,
      toPercentage,
      deltaPoints: roundOne(toPercentage - originalDriver.percentage),
    });
  }

  return {
    comparableCustomers: sharedIds.length,
    requestedCustomers: customerIdsFromSimulation(original).length,
    originalCompleted: original.backendResult.completed_customers,
    variantCompleted: variant.backendResult.completed_customers,
    original: originalAgg,
    variant: variantAgg,
    buyDelta,
    considerDelta,
    rejectDelta,
    purchaseIntentDelta,
    changedDecisions,
    sameDecisions,
    improved,
    worsened,
    transitions,
    customerMovements: customerMovements
      .filter((item) => item.changed)
      .sort(
        (left, right) =>
          Math.abs(right.toIntent - right.fromIntent) -
          Math.abs(left.toIntent - left.fromIntent),
      ),
    segmentMovements: segmentMovements.slice(0, 6),
    barrierDeltas,
    outcome: buildOutcome(
      buyDelta,
      rejectDelta,
      purchaseIntentDelta,
      improved,
      worsened,
    ),
  };
}
