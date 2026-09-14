export type SimulationInput = {
  product_name: string;
  description: string;
  price: number;
  key_features: string[];
  target_market: string;
  customer_ids?: string[];
};

export type CustomerResponse = {
  customer_id: string;
  overall_interest: number;
  understanding: number;
  trust: number;
  price_acceptance: number;
  purchase_intent: number;
  would_buy: boolean;
  would_consider: boolean;
  primary_objection: string;
  secondary_objection: string;
  positive_factors: string[];
  negative_factors: string[];
  questions: string[];
  reasoning: string;
};

export type SimulationResult = {
  test_id: string;
  total_customers: number;
  completed_customers: number;
  failed_customers: number;
  failed_customer_ids: string[];
  responses: CustomerResponse[];
};

export type CustomerSimulationState =
  | "WAITING"
  | "EVALUATING"
  | "BUY"
  | "CONSIDER"
  | "REJECT"
  | "FAILED";

export type SimulationJobStatusValue =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type CustomerProgress = {
  customer_id: string;
  name: string;
  state: CustomerSimulationState;
};

export type SimulationJobStatus = {
  job_id: string;
  status: SimulationJobStatusValue;
  total_customers: number;
  completed_customers: number;
  failed_customers: number;
  buy_count: number;
  consider_count: number;
  reject_count: number;
  customers: CustomerProgress[];
  result: SimulationResult | null;
  error: string | null;
};

export type StoredSimulationMeta = {
  jobId: string;
  productName: string;
  testType: string;
  description: string;
  price: number;
  targetMarket: string;
  keyFeatures: string[];
};

export type StoredSimulation = {
  testId: string;
  productName: string;
  testType: string;
  description: string;
  price: number;
  targetMarket: string;
  keyFeatures: string[];
  backendResult: SimulationResult;
};

export type FinancialBehaviour = {
  price_sensitivity: number;
  willingness_to_finance: number;
  impulse_buying: number;
};

export type Personality = {
  risk_tolerance: number;
  trust_requirement: number;
  research_tendency: number;
  brand_loyalty: number;
};

export type ShoppingBehaviour = {
  reads_reviews: boolean;
  compares_competitors: boolean;
  checks_prices: boolean;
  prefers_online_shopping: boolean;
};

export type CustomerProfile = {
  id: string;
  name: string;
  archetype: string;
  age: number;
  state: string;
  location: string;
  occupation: string;
  income_band: string;
  household: string;
  home_ownership: string;
  education: string;
  digital_literacy: number;
  financial_behaviour: FinancialBehaviour;
  personality: Personality;
  shopping_behaviour: ShoppingBehaviour;
  motivations: string[];
  concerns: string[];
  behavioural_rules: string[];
};

export const SIMULATION_RESULT_KEY = "customerLabSimulation";
export const SIMULATION_JOB_KEY = "customerLabSimulationJob";
export const NEXT_TEST_DRAFT_KEY = "customerLabNextTest";
export const COMPARISON_SESSION_KEY = "customerLabComparison";
export const SESSION_UPDATED_EVENT = "arnabela-session-updated";

function notifySessionUpdated() {
  window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
}

export function subscribeToSessionStore(
  onStoreChange: () => void,
) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SESSION_UPDATED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(
      SESSION_UPDATED_EVENT,
      onStoreChange,
    );
  };
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function readApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const errorData = await response.json();

    if (typeof errorData.detail === "string") {
      return errorData.detail;
    }
  } catch {
    // Keep the default error message.
  }

  return fallback;
}

export async function runSimulation(
  input: SimulationInput,
): Promise<SimulationResult> {
  const response = await fetch(`${API_URL}/simulations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        `Simulation failed with status ${response.status}.`,
      ),
    );
  }

  return response.json();
}

export async function startSimulationJob(
  input: SimulationInput,
): Promise<SimulationJobStatus> {
  const payload: SimulationInput = {
    product_name: input.product_name,
    description: input.description,
    price: input.price,
    key_features: input.key_features,
    target_market: input.target_market,
  };

  if (input.customer_ids && input.customer_ids.length > 0) {
    payload.customer_ids = input.customer_ids;
  }

  const response = await fetch(`${API_URL}/simulation-jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        `Simulation job failed with status ${response.status}.`,
      ),
    );
  }

  return response.json();
}

export async function getSimulationJob(
  jobId: string,
): Promise<SimulationJobStatus> {
  const response = await fetch(
    `${API_URL}/simulation-jobs/${jobId}`,
  );

  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        `Unable to load simulation job (${response.status}).`,
      ),
    );
  }

  return response.json();
}

export function storeSimulationJobMeta(
  meta: StoredSimulationMeta,
): void {
  sessionStorage.setItem(
    SIMULATION_JOB_KEY,
    JSON.stringify(meta),
  );
  notifySessionUpdated();
}

export function readSimulationJobMeta():
  | StoredSimulationMeta
  | null {
  const raw = sessionStorage.getItem(SIMULATION_JOB_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSimulationMeta;
  } catch {
    return null;
  }
}

export function storeCompletedSimulation(
  meta: StoredSimulationMeta,
  result: SimulationResult,
): void {
  const stored: StoredSimulation = {
    testId: result.test_id,
    productName: meta.productName,
    testType: meta.testType,
    description: meta.description,
    price: meta.price,
    targetMarket: meta.targetMarket,
    keyFeatures: meta.keyFeatures,
    backendResult: result,
  };

  sessionStorage.setItem(
    SIMULATION_RESULT_KEY,
    JSON.stringify(stored),
  );
  notifySessionUpdated();
}

export function clearCompletedSimulation(): void {
  sessionStorage.removeItem(SIMULATION_RESULT_KEY);
  notifySessionUpdated();
}

export type NextTestDraft = {
  productName: string;
  testType: string;
  description: string;
  price: number;
  targetMarket: string;
  keyFeatures: string[];
  insightHeadline: string;
  nextExperiment: string;
  nextExperimentKind: string;
};

export function storeNextTestDraft(draft: NextTestDraft): void {
  sessionStorage.setItem(
    NEXT_TEST_DRAFT_KEY,
    JSON.stringify(draft),
  );
  notifySessionUpdated();
}

export function readNextTestDraft(): NextTestDraft | null {
  const raw = sessionStorage.getItem(NEXT_TEST_DRAFT_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as NextTestDraft;
  } catch {
    return null;
  }
}

export function clearNextTestDraft(): void {
  sessionStorage.removeItem(NEXT_TEST_DRAFT_KEY);
  notifySessionUpdated();
}

export type ComparisonVariantDraft = {
  productName: string;
  testType: string;
  description: string;
  price: number;
  targetMarket: string;
  keyFeatures: string[];
  insightHeadline: string;
  nextExperiment: string;
  nextExperimentKind: string;
  label: string;
  recommendationType: string;
  recommendationTitle: string;
  recommendationReason: string;
  canApply: boolean;
  applyBlockReason: string | null;
  changedFields: string[];
  parentTestId: string;
  changeSummary: Array<{
    field: string;
    from: string;
    to: string;
    changed: boolean;
  }>;
};

export type ComparisonSession = {
  baseline: StoredSimulation;
  customerIds: string[];
  variantDraft: ComparisonVariantDraft;
  variant: StoredSimulation | null;
  variantJobId: string | null;
};

export function storeComparisonSession(
  session: ComparisonSession,
): void {
  sessionStorage.setItem(
    COMPARISON_SESSION_KEY,
    JSON.stringify(session),
  );
  notifySessionUpdated();
}

export function readComparisonSession(): ComparisonSession | null {
  const raw = sessionStorage.getItem(COMPARISON_SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ComparisonSession;
  } catch {
    return null;
  }
}

export function clearComparisonSession(): void {
  sessionStorage.removeItem(COMPARISON_SESSION_KEY);
  notifySessionUpdated();
}

export function updateComparisonVariantDraft(
  draft: ComparisonVariantDraft,
): void {
  const session = readComparisonSession();

  if (!session) {
    return;
  }

  storeComparisonSession({
    ...session,
    variantDraft: draft,
  });
}

export function storeComparisonVariantResult(
  variant: StoredSimulation,
): void {
  const session = readComparisonSession();

  if (!session) {
    return;
  }

  storeComparisonSession({
    ...session,
    variant,
    variantJobId: null,
  });
}

export async function getCustomers(): Promise<
  CustomerProfile[]
> {
  const response = await fetch(`${API_URL}/customers`);

  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        "Unable to load customer profiles.",
      ),
    );
  }

  const data = (await response.json()) as {
    customers?: CustomerProfile[];
  };

  return data.customers ?? [];
}

export async function getCustomerById(
  customerId: string,
): Promise<CustomerProfile> {
  const response = await fetch(
    `${API_URL}/customers/${customerId}`,
  );

  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        `Unable to load customer '${customerId}'.`,
      ),
    );
  }

  return response.json();
}
