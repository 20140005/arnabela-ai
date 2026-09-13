export type MockSimulation = {
  testId: string;
  productName: string;
  testType: string;
  description: string;
  price: number;
  targetMarket: string;
  keyFeatures: string[];
};

export function createMockSimulation(
  simulation: MockSimulation
): MockSimulation {
  return simulation;
}