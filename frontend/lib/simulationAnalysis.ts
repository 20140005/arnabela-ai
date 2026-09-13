export type SimulationInput = {
  testId: string;
  productName: string;
  testType: string;
  description: string;
  price: number;
  targetMarket: string;
  keyFeatures: string[];
};

export type CustomerResponse = {
  customerId: string;
  name: string;
  archetype: string;

  overallInterest: number;
  understanding: number;
  trust: number;
  priceAcceptance: number;
  purchaseIntent: number;

  wouldBuy: boolean;
  wouldConsider: boolean;

  primaryObjection: string;
  secondaryObjection: string;

  positiveFactors: string[];
  negativeFactors: string[];

  questions: string[];
  reasoning: string;
};

export type ArchetypeResult = {
  name: string;
  customers: number;
  interest: number;
  purchaseIntent: number;
};

export type SimulationAnalysis = {
  totalCustomers: number;
  completedCustomers: number;

  overallInterest: number;
  overallUnderstanding: number;
  overallTrust: number;
  overallPriceAcceptance: number;
  overallPurchaseIntent: number;

  wouldBuyPercentage: number;
  wouldConsiderPercentage: number;
  rejectedPercentage: number;

  topObjections: {
    label: string;
    percentage: number;
  }[];

  strongestSignals: {
    title: string;
    description: string;
  }[];

  archetypes: ArchetypeResult[];

  responses: CustomerResponse[];

  takeaway: {
    headline: string;
    supportingText: string;
  };
};

const archetypeDefinitions = [
  {
    name: "Budget-Focused",
    interest: 4.2,
    understanding: 6.8,
    trust: 6.1,
    priceAcceptance: 3.4,
    purchaseIntent: 2.8,
  },
  {
    name: "Premium Value",
    interest: 7.4,
    understanding: 7.7,
    trust: 7.3,
    priceAcceptance: 6.5,
    purchaseIntent: 6.1,
  },
  {
    name: "Tech Enthusiast",
    interest: 8.6,
    understanding: 8.7,
    trust: 7.9,
    priceAcceptance: 8.0,
    purchaseIntent: 7.8,
  },
  {
    name: "Risk-Averse",
    interest: 4.8,
    understanding: 6.9,
    trust: 5.1,
    priceAcceptance: 4.2,
    purchaseIntent: 3.1,
  },
  {
    name: "Convenience-First",
    interest: 7.1,
    understanding: 8.0,
    trust: 7.0,
    priceAcceptance: 6.8,
    purchaseIntent: 6.4,
  },
  {
    name: "Family-Focused",
    interest: 5.8,
    understanding: 7.1,
    trust: 6.7,
    priceAcceptance: 5.2,
    purchaseIntent: 4.5,
  },
  {
    name: "Sustainability-Focused",
    interest: 8.2,
    understanding: 8.1,
    trust: 7.7,
    priceAcceptance: 7.1,
    purchaseIntent: 7.2,
  },
  {
    name: "Brand-Loyal",
    interest: 5.1,
    understanding: 6.8,
    trust: 5.8,
    priceAcceptance: 4.8,
    purchaseIntent: 3.7,
  },
  {
    name: "Impulse Early Adopter",
    interest: 7.9,
    understanding: 7.5,
    trust: 6.8,
    priceAcceptance: 7.4,
    purchaseIntent: 6.9,
  },
  {
    name: "Practical Skeptical",
    interest: 4.6,
    understanding: 6.7,
    trust: 5.6,
    priceAcceptance: 4.3,
    purchaseIntent: 3.3,
  },
];

const customerNames = [
  "Sarah",
  "Jake",
  "Olivia",
  "Liam",
  "Emma",
  "Noah",
  "Mia",
  "Jack",
  "Sophie",
  "Daniel",
];

function clampScore(score: number): number {
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce((total, value) => total + value, 0) /
    values.length
  );
}

function percentage(
  count: number,
  total: number
): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((count / total) * 100);
}

function getObjection(
  archetype: string,
  price: number
): string {
  if (
    archetype === "Budget-Focused" ||
    price >= 5000
  ) {
    return "Price feels too high";
  }

  if (archetype === "Risk-Averse") {
    return "Need proof it actually works";
  }

  if (
    archetype === "Brand-Loyal" ||
    archetype === "Practical Skeptical"
  ) {
    return "Already have a current solution";
  }

  if (archetype === "Convenience-First") {
    return "Concerned about setup time";
  }

  return "Need more information before buying";
}

function getPositiveFactors(
  simulation: SimulationInput,
  archetype: string
): string[] {
  const factors: string[] = [];

  if (simulation.keyFeatures.length > 0) {
    factors.push(
      simulation.keyFeatures[0]
    );
  }

  if (archetype === "Convenience-First") {
    factors.push("Saves time");
  } else if (archetype === "Tech Enthusiast") {
    factors.push("Technology and innovation");
  } else if (
    archetype === "Sustainability-Focused"
  ) {
    factors.push("Potential environmental value");
  } else {
    factors.push("Clear value proposition");
  }

  return factors.slice(0, 2);
}

function getReasoning(
  simulation: SimulationInput,
  archetype: string,
  wouldBuy: boolean,
  wouldConsider: boolean
): string {
  if (wouldBuy) {
    return (
      `As a ${archetype.toLowerCase()} customer, ` +
      `the product appears relevant and the value is strong enough ` +
      `to justify seriously considering a purchase.`
    );
  }

  if (wouldConsider) {
    return (
      `As a ${archetype.toLowerCase()} customer, ` +
      `the product is interesting, but I would want more evidence, ` +
      `comparison or confidence before purchasing.`
    );
  }

  return (
    `As a ${archetype.toLowerCase()} customer, ` +
    `the product does not currently provide enough value or ` +
    `confidence for me to purchase it.`
  );
}

function createCustomerResponse(
  simulation: SimulationInput,
  archetypeIndex: number,
  customerIndex: number
): CustomerResponse {
  const definition =
    archetypeDefinitions[archetypeIndex];

  const variation =
    ((customerIndex % 5) - 2) * 0.2;

  const overallInterest = clampScore(
    definition.interest + variation
  );

  const understanding = clampScore(
    definition.understanding + variation
  );

  const trust = clampScore(
    definition.trust + variation
  );

  const priceAcceptance = clampScore(
    definition.priceAcceptance + variation
  );

  const purchaseIntent = clampScore(
    definition.purchaseIntent + variation
  );

  const wouldBuy =
    purchaseIntent >= 7 &&
    priceAcceptance >= 6;

  const wouldConsider =
    !wouldBuy &&
    purchaseIntent >= 4;

  const objection = getObjection(
    definition.name,
    simulation.price
  );

  const secondaryObjection =
    definition.name === "Risk-Averse"
      ? "Would compare alternatives first"
      : "Would want more information";

  const positiveFactors = getPositiveFactors(
    simulation,
    definition.name
  );

  const negativeFactors = [
    objection,
    secondaryObjection,
  ];

  return {
    customerId: String(customerIndex + 1).padStart(
      3,
      "0"
    ),
    name:
      customerNames[
        customerIndex % customerNames.length
      ],
    archetype: definition.name,

    overallInterest,
    understanding,
    trust,
    priceAcceptance,
    purchaseIntent,

    wouldBuy,
    wouldConsider,

    primaryObjection: objection,
    secondaryObjection,

    positiveFactors,
    negativeFactors,

    questions: [
      "What evidence supports the product's claims?",
    ],

    reasoning: getReasoning(
      simulation,
      definition.name,
      wouldBuy,
      wouldConsider
    ),
  };
}

export function generateMockResponses(
  simulation: SimulationInput
): CustomerResponse[] {
  const responses: CustomerResponse[] = [];

  for (
    let archetypeIndex = 0;
    archetypeIndex < archetypeDefinitions.length;
    archetypeIndex++
  ) {
    for (
      let customerOffset = 0;
      customerOffset < 10;
      customerOffset++
    ) {
      const customerIndex =
        archetypeIndex * 10 + customerOffset;

      responses.push(
        createCustomerResponse(
          simulation,
          archetypeIndex,
          customerIndex
        )
      );
    }
  }

  return responses;
}

function calculateTopObjections(
  responses: CustomerResponse[]
) {
  const counts = new Map<string, number>();

  for (const response of responses) {
    counts.set(
      response.primaryObjection,
      (counts.get(response.primaryObjection) || 0) + 1
    );
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({
      label,
      percentage: percentage(
        count,
        responses.length
      ),
    }))
    .sort(
      (a, b) => b.percentage - a.percentage
    )
    .slice(0, 4);
}

function calculateArchetypes(
  responses: CustomerResponse[]
): ArchetypeResult[] {
  return archetypeDefinitions.map(
    (definition) => {
      const group = responses.filter(
        (response) =>
          response.archetype === definition.name
      );

      return {
        name: definition.name,
        customers: group.length,
        interest: Math.round(average(group.map((response) => response.overallInterest)) * 10),
        purchaseIntent: Math.round(
          average(
            group.map(
              (response) =>
                response.purchaseIntent
            )
          ) * 10
        ),
      };
    }
  );
}

function calculateStrongestSignals(
  simulation: SimulationInput,
  responses: CustomerResponse[]
) {
  const feature =
    simulation.keyFeatures[0] ||
    "Core product value";

  const averageUnderstanding =
    average(
      responses.map(
        (response) => response.understanding
      )
    );

  const averageTrust =
    average(
      responses.map(
        (response) => response.trust
      )
    );

  return [
    {
      title: feature,
      description:
        `Customers recognised this as a meaningful ` +
        `part of the product's value proposition.`,
    },
    {
      title: "Clear value proposition",
      description:
        `Average customer understanding was ` +
        `${averageUnderstanding.toFixed(1)}/10.`,
    },
    {
      title: "Customer relevance",
      description:
        `Average trust reached ` +
        `${averageTrust.toFixed(1)}/10 across the simulated audience.`,
    },
  ];
}

function calculateTakeaway(
  responses: CustomerResponse[]
): {
  headline: string;
  supportingText: string;
} {
  const buyPercentage = percentage(
    responses.filter(
      (response) => response.wouldBuy
    ).length,
    responses.length
  );

  const considerPercentage = percentage(
    responses.filter(
      (response) => response.wouldConsider
    ).length,
    responses.length
  );

  if (buyPercentage >= 60) {
    return {
      headline:
        "Strong purchase signal across the simulated audience.",
      supportingText:
        `${buyPercentage}% would buy and ` +
        `${considerPercentage}% would consider the product.`,
    };
  }

  if (considerPercentage >= 50) {
    return {
      headline:
        "The product shows meaningful customer interest.",
      supportingText:
        `Many customers see potential value, but ` +
        `purchase confidence still needs to improve.`,
    };
  }

  return {
    headline:
      "The concept needs stronger customer validation.",
    supportingText:
      `Customer interest is present, but the current ` +
      `value proposition does not consistently convert into purchase intent.`,
  };
}

export function analyseSimulation(
  simulation: SimulationInput
): SimulationAnalysis {
  const responses =
    generateMockResponses(simulation);

  const wouldBuyCount =
    responses.filter(
      (response) => response.wouldBuy
    ).length;

  const wouldConsiderCount =
    responses.filter(
      (response) => response.wouldConsider
    ).length;

  const rejectedCount =
    responses.filter(
      (response) =>
        !response.wouldBuy &&
        !response.wouldConsider
    ).length;

  return {
    totalCustomers: responses.length,
    completedCustomers: responses.length,

    overallInterest: Number(
      average(
        responses.map(
          (response) =>
            response.overallInterest
        )
      ).toFixed(1)
    ),

    overallUnderstanding: Number(
      average(
        responses.map(
          (response) =>
            response.understanding
        )
      ).toFixed(1)
    ),

    overallTrust: Number(
      average(
        responses.map(
          (response) => response.trust
        )
      ).toFixed(1)
    ),

    overallPriceAcceptance: Number(
      average(
        responses.map(
          (response) =>
            response.priceAcceptance
        )
      ).toFixed(1)
    ),

    overallPurchaseIntent: Number(
      average(
        responses.map(
          (response) =>
            response.purchaseIntent
        )
      ).toFixed(1)
    ),

    wouldBuyPercentage: percentage(
      wouldBuyCount,
      responses.length
    ),

    wouldConsiderPercentage: percentage(
      wouldConsiderCount,
      responses.length
    ),

    rejectedPercentage: percentage(
      rejectedCount,
      responses.length
    ),

    topObjections:
      calculateTopObjections(responses),

    strongestSignals:
      calculateStrongestSignals(
        simulation,
        responses
      ),

    archetypes:
      calculateArchetypes(responses),

    responses,

    takeaway:
      calculateTakeaway(responses),
  };
}