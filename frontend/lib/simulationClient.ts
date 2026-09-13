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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
    let message = `Simulation failed with status ${response.status}.`;

    try {
      const errorData = await response.json();

      if (errorData.detail) {
        message = errorData.detail;
      }
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  return response.json();
}