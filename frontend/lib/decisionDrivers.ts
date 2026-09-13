import type { CustomerResponse } from "./simulationClient";

type CustomerIdentity = {
  name: string;
  archetype: string;
};

export type AffectedArchetype = {
  name: string;
  count: number;
};

const FALLBACK_ARCHETYPE = "Simulated Customer";
const DEFAULT_DRIVER_LIMIT = 8;
const DEFAULT_REPRESENTATIVE_LIMIT = 3;
const DEFAULT_ARCHETYPE_LIMIT = 3;

function fallbackCustomerName(customerId: string) {
  return `Customer ${customerId}`;
}

export type DriverRepresentative = {
  customer_id: string;
  name: string;
  archetype: string;
  excerpt: string;
};

export type DecisionDriver = {
  id: string;
  label: string;
  count: number;
  percentage: number;
  archetypes: AffectedArchetype[];
  representatives: DriverRepresentative[];
};

export type DecisionDriversResult = {
  respondingCustomers: number;
  totalCustomers: number;
  failedCustomers: number;
  positive: DecisionDriver[];
  negative: DecisionDriver[];
};

function driverKey(label: string) {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

export function calculatePercentage(
  value: number,
  total: number,
) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function uniqueNonEmptyLabels(values: string[]) {
  const seen = new Set<string>();
  const labels: { key: string; label: string }[] = [];

  for (const value of values) {
    const trimmed = value.trim().replace(/\s+/g, " ");

    if (!trimmed) {
      continue;
    }

    const key = driverKey(trimmed);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    labels.push({ key, label: trimmed });
  }

  return labels;
}

function excerptFromResponse(
  response: CustomerResponse,
  fallback: string,
) {
  const reasoning = response.reasoning.trim();
  const mechanical =
    /relevance\s+adjustment|price\s+adjustment|trust\s+adjustment|As a .+?, this customer responds/i.test(
      reasoning,
    );

  // Prefer a readable factor/objection over internal scoring templates.
  if (!reasoning || mechanical) {
    const preferred =
      response.positive_factors.find((item) => item.trim()) ||
      response.primary_objection.trim() ||
      fallback;
    return preferred.length <= 160
      ? preferred
      : `${preferred.slice(0, 157).trimEnd()}...`;
  }

  if (reasoning.length <= 160) {
    return reasoning;
  }

  return `${reasoning.slice(0, 157).trimEnd()}...`;
}

function buildDriver(
  label: string,
  key: string,
  matches: Array<CustomerResponse & CustomerIdentity>,
  respondingCustomers: number,
): DecisionDriver {
  const archetypeCounts = new Map<string, number>();

  for (const match of matches) {
    archetypeCounts.set(
      match.archetype,
      (archetypeCounts.get(match.archetype) ?? 0) + 1,
    );
  }

  const archetypes = Array.from(archetypeCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, DEFAULT_ARCHETYPE_LIMIT);

  const representatives = matches
    .slice(0, DEFAULT_REPRESENTATIVE_LIMIT)
    .map((match) => ({
      customer_id: match.customer_id,
      name: match.name,
      archetype: match.archetype,
      excerpt: excerptFromResponse(match, label),
    }));

  return {
    id: key,
    label,
    count: matches.length,
    percentage: calculatePercentage(
      matches.length,
      respondingCustomers,
    ),
    archetypes,
    representatives,
  };
}

function collectDrivers(
  groups: Map<
    string,
    {
      label: string;
      matches: Array<CustomerResponse & CustomerIdentity>;
    }
  >,
  respondingCustomers: number,
  limit: number,
) {
  return Array.from(groups.values())
    .map((group) =>
      buildDriver(
        group.label,
        driverKey(group.label),
        group.matches,
        respondingCustomers,
      ),
    )
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label);
    })
    .slice(0, limit);
}

export function buildDecisionDrivers(
  responses: CustomerResponse[],
  profilesById: Map<string, CustomerIdentity>,
  options?: {
    totalCustomers?: number;
    failedCustomers?: number;
    limit?: number;
  },
): DecisionDriversResult {
  const respondingCustomers = responses.length;
  const limit = options?.limit ?? DEFAULT_DRIVER_LIMIT;

  const enriched = responses.map((response) => {
    const profile = profilesById.get(response.customer_id);

    return {
      ...response,
      name:
        profile?.name ??
        fallbackCustomerName(response.customer_id),
      archetype:
        profile?.archetype ?? FALLBACK_ARCHETYPE,
    };
  });

  const positiveGroups = new Map<
    string,
    {
      label: string;
      matches: typeof enriched;
    }
  >();

  const negativeGroups = new Map<
    string,
    {
      label: string;
      matches: typeof enriched;
    }
  >();

  for (const response of enriched) {
    for (const factor of uniqueNonEmptyLabels(
      response.positive_factors,
    )) {
      const existing = positiveGroups.get(factor.key);

      if (existing) {
        existing.matches.push(response);
      } else {
        positiveGroups.set(factor.key, {
          label: factor.label,
          matches: [response],
        });
      }
    }

    const objection = uniqueNonEmptyLabels([
      response.primary_objection,
    ])[0];

    if (!objection) {
      continue;
    }

    const existing = negativeGroups.get(objection.key);

    if (existing) {
      existing.matches.push(response);
    } else {
      negativeGroups.set(objection.key, {
        label: objection.label,
        matches: [response],
      });
    }
  }

  return {
    respondingCustomers,
    totalCustomers:
      options?.totalCustomers ?? respondingCustomers,
    failedCustomers: options?.failedCustomers ?? 0,
    positive: collectDrivers(
      positiveGroups,
      respondingCustomers,
      limit,
    ),
    negative: collectDrivers(
      negativeGroups,
      respondingCustomers,
      limit,
    ),
  };
}
