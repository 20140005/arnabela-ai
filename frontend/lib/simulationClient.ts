export type SimulationInput = {
  product_name: string;
  description: string;
  price: number;
  key_features: string[];
  target_market: string;
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

export const SIMULATION_RESULT_KEY = "customerLabSimulation";
export const SIMULATION_JOB_KEY = "customerLabSimulationJob";

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
  const response = await fetch(`${API_URL}/simulation-jobs`, {
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
}
