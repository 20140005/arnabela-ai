import type { CustomerResponse } from "./simulationClient";

export type DecisionLabel = "BUY" | "CONSIDER" | "REJECT";

export type PreviewIdentity = {
  name: string;
  archetype: string;
};

export type PreviewCustomer = CustomerResponse & PreviewIdentity;

const FALLBACK_ARCHETYPE = "Simulated Customer";

export function decisionFromResponse(response: {
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

export function fallbackCustomerName(customerId: string) {
  return `Customer ${customerId}`;
}

export function selectPreviewCustomers(
  responses: CustomerResponse[],
  profilesById: Map<string, PreviewIdentity>,
  limit = 6,
): PreviewCustomer[] {
  const enriched: PreviewCustomer[] = responses.map(
    (response) => {
      const profile = profilesById.get(response.customer_id);

      return {
        ...response,
        name:
          profile?.name ??
          fallbackCustomerName(response.customer_id),
        archetype:
          profile?.archetype ?? FALLBACK_ARCHETYPE,
      };
    },
  );

  const selected: PreviewCustomer[] = [];
  const usedIds = new Set<string>();
  const usedArchetypes = new Set<string>();

  for (const customer of enriched) {
    if (selected.length >= limit) {
      break;
    }

    if (customer.archetype === FALLBACK_ARCHETYPE) {
      continue;
    }

    if (usedArchetypes.has(customer.archetype)) {
      continue;
    }

    selected.push(customer);
    usedIds.add(customer.customer_id);
    usedArchetypes.add(customer.archetype);
  }

  for (const customer of enriched) {
    if (selected.length >= limit) {
      break;
    }

    if (usedIds.has(customer.customer_id)) {
      continue;
    }

    selected.push(customer);
    usedIds.add(customer.customer_id);
  }

  return selected;
}
