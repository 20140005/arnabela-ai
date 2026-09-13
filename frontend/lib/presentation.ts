import type { CustomerResponse } from "./simulationClient";

/**
 * Format a numeric price for user-facing display.
 * Does not change the underlying API value.
 */
export function formatPrice(
  value: number,
  options?: { withCurrencyCode?: boolean },
): string {
  if (!Number.isFinite(value) || value < 0) {
    return "";
  }

  const fractionDigits = Number.isInteger(value) ? 0 : 2;
  const amount = value.toLocaleString("en-AU", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  const formatted = `$${amount}`;

  return options?.withCurrencyCode
    ? `${formatted} AUD`
    : formatted;
}

/** Rewrite bare `$2499` style amounts inside free text. */
export function formatPricesInText(text: string): string {
  return text.replace(
    /\$(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?\b/g,
    (match, whole: string, fraction?: string) => {
      const normalized = whole.replace(/,/g, "");
      const numeric = fraction
        ? Number(`${normalized}.${fraction}`)
        : Number(normalized);

      if (!Number.isFinite(numeric)) {
        return match;
      }

      return formatPrice(numeric);
    },
  );
}

export type CustomerReasoningInput = {
  reasoning: string;
  positive_factors: string[];
  negative_factors: string[];
  primary_objection: string;
  secondary_objection: string;
  would_buy: boolean;
  would_consider: boolean;
  price_acceptance: number;
  trust: number;
  overall_interest: number;
  purchase_intent: number;
  motivations?: string[];
  concerns?: string[];
  productPrice?: number;
};

function looksMechanical(reasoning: string) {
  return (
    /relevance\s+adjustment/i.test(reasoning) ||
    /price\s+adjustment/i.test(reasoning) ||
    /trust\s+adjustment/i.test(reasoning) ||
    /As a .+?, this customer responds/i.test(reasoning)
  );
}

function stripInternalScoringLanguage(reasoning: string) {
  return reasoning
    .replace(
      /The product received a relevance adjustment of [^.]+\.\s*/gi,
      "",
    )
    .replace(
      /(?:a |the )?relevance adjustment of -?\d+(?:,|\s+and)?\s*/gi,
      "",
    )
    .replace(/(?:a |the )?price adjustment of -?\d+(?:,|\s+and)?\s*/gi, "")
    .replace(/(?:a |the )?trust adjustment of -?\d+\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

function lowercaseLead(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "";
  }
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function uniqueLabels(values: string[]) {
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const value of values) {
    const trimmed = value.trim().replace(/\s+/g, " ");
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    labels.push(trimmed);
  }

  return labels;
}

function buildHumanPerspective(input: CustomerReasoningInput) {
  const positives = uniqueLabels(input.positive_factors).slice(0, 2);
  const concerns = uniqueLabels([
    input.primary_objection,
    input.secondary_objection,
    ...input.negative_factors,
    ...(input.concerns ?? []),
  ]).slice(0, 2);
  const motivation = uniqueLabels(input.motivations ?? [])[0];
  const priceLabel =
    typeof input.productPrice === "number" && input.productPrice > 0
      ? formatPrice(input.productPrice)
      : null;

  const parts: string[] = [];

  if (input.would_buy) {
    if (positives[0]) {
      parts.push(
        `I'd be interested because ${lowercaseLead(positives[0])}.`,
      );
    } else {
      parts.push("I'd be interested in trying this.");
    }
  } else if (input.would_consider) {
    if (positives[0]) {
      parts.push(
        `I'd consider it — ${lowercaseLead(positives[0])} appeals to me.`,
      );
    } else {
      parts.push(
        "I'd consider this, but I'm not ready to commit yet.",
      );
    }
  } else if (concerns[0]) {
    parts.push(
      `I'd be unlikely to buy this. My main concern would be ${lowercaseLead(concerns[0])}.`,
    );
  } else {
    parts.push("I'd be unlikely to buy this as it stands.");
  }

  if (positives[1]) {
    parts.push(`I also like that ${lowercaseLead(positives[1])}.`);
  }

  if (
    concerns[0] &&
    !(
      !input.would_buy &&
      !input.would_consider &&
      parts[0]?.toLowerCase().includes(lowercaseLead(concerns[0]))
    )
  ) {
    const lead =
      input.would_buy || input.would_consider
        ? "My main concern would be"
        : "I'd also worry about";
    parts.push(`${lead} ${lowercaseLead(concerns[0])}.`);
  }

  if (concerns[1] && (input.would_buy || input.would_consider)) {
    parts.push(`I'd also want clarity on ${lowercaseLead(concerns[1])}.`);
  }

  if (priceLabel) {
    if (input.price_acceptance <= 4) {
      parts.push(
        `At ${priceLabel}, the price would be a real consideration for me.`,
      );
    } else if (input.price_acceptance <= 6) {
      parts.push(
        `At ${priceLabel}, I'd want to be confident the value is there.`,
      );
    } else if (input.would_buy || input.would_consider) {
      parts.push(
        `At ${priceLabel}, the price feels workable given what I'd get.`,
      );
    }
  }

  if (motivation && (input.would_buy || input.would_consider)) {
    parts.push(
      `That lines up with what usually motivates me: ${lowercaseLead(motivation)}.`,
    );
  } else if (
    input.trust <= 4 &&
    (input.would_consider || !input.would_buy)
  ) {
    parts.push(
      "I'd want clearer proof it actually works before going further.",
    );
  }

  return parts.join(" ").replace(/\s{2,}/g, " ").trim();
}

/**
 * Present customer reasoning for end users.
 * Strips internal scoring language and rebuilds mechanical templates
 * from existing profile + response fields. Natural reasoning is preserved.
 */
export function presentCustomerReasoning(
  input: CustomerReasoningInput,
): string {
  const raw = input.reasoning.trim();

  if (!raw || looksMechanical(raw)) {
    const rebuilt = buildHumanPerspective(input);
    return rebuilt || "No perspective was available for this customer.";
  }

  const cleaned = stripInternalScoringLanguage(raw);
  if (!cleaned || looksMechanical(cleaned)) {
    return buildHumanPerspective(input);
  }

  const humanized = cleaned
    .replace(
      /^As a .+?, this customer\b/i,
      "From my point of view, I",
    )
    .replace(/\bthis customer\b/gi, "I")
    .replace(/\bThis customer\b/g, "I");

  return formatPricesInText(humanized);
}

export function reasoningExcerpt(
  response: Pick<
    CustomerResponse,
    | "reasoning"
    | "positive_factors"
    | "negative_factors"
    | "primary_objection"
    | "secondary_objection"
    | "would_buy"
    | "would_consider"
    | "price_acceptance"
    | "trust"
    | "overall_interest"
    | "purchase_intent"
  >,
  fallback: string,
  limit = 160,
) {
  const presented = presentCustomerReasoning({
    reasoning: response.reasoning,
    positive_factors: response.positive_factors,
    negative_factors: response.negative_factors,
    primary_objection: response.primary_objection,
    secondary_objection: response.secondary_objection,
    would_buy: response.would_buy,
    would_consider: response.would_consider,
    price_acceptance: response.price_acceptance,
    trust: response.trust,
    overall_interest: response.overall_interest,
    purchase_intent: response.purchase_intent,
  }).trim();

  const source = presented || fallback.trim() || response.reasoning.trim();

  if (!source) {
    return fallback;
  }

  if (source.length <= limit) {
    return source;
  }

  return `${source.slice(0, limit - 3).trimEnd()}...`;
}
