"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

type CustomerResponse = {
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

type BackendSimulationResult = {
  test_id: string;
  total_customers: number;
  completed_customers: number;
  failed_customers: number;
  failed_customer_ids: string[];
  responses: CustomerResponse[];
};

type StoredSimulation = {
  testId: string;
  productName: string;
  testType: string;
  description: string;
  price: number;
  targetMarket: string;
  keyFeatures: string[];
  backendResult: BackendSimulationResult;
};

type CustomerProfile = {
  id: string;
  name: string;
  archetype: string;
};

type PreviewCustomer = CustomerResponse & {
  name: string;
  archetype: string;
};

type ArchetypeResult = {
  name: string;
  customers: number;
  interest: number;
  purchaseIntent: number;
};

type ObjectionResult = {
  label: string;
  percentage: number;
};

type SignalResult = {
  title: string;
  description: string;
};

type Takeaway = {
  headline: string;
  supportingText: string;
};

type Analysis = {
  totalCustomers: number;
  completedCustomers: number;
  failedCustomers: number;
  overallPurchaseIntent: number;
  wouldBuyPercentage: number;
  wouldConsiderPercentage: number;
  rejectedPercentage: number;
  topObjections: ObjectionResult[];
  strongestSignals: SignalResult[];
  archetypes: ArchetypeResult[];
  previewCustomers: PreviewCustomer[];
  takeaway: Takeaway;
};

function getStoredSimulation() {
  return sessionStorage.getItem(
    "customerLabSimulation",
  );
}

function subscribeToStorage() {
  return () => {};
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function calculatePercentage(
  value: number,
  total: number,
) {
  if (total === 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function analyseBackendSimulation(
  simulation: StoredSimulation,
  customers: CustomerProfile[],
): Analysis {
  const result = simulation.backendResult;
  const responses = result.responses;

  const customerMap = new Map(
    customers.map((customer) => [
      customer.id,
      customer,
    ]),
  );

  const enrichedResponses: PreviewCustomer[] =
    responses.map((response) => {
      const profile = customerMap.get(
        response.customer_id,
      );

      return {
        ...response,
        name:
          profile?.name ??
          `Customer ${response.customer_id}`,
        archetype:
          profile?.archetype ??
          "Simulated Customer",
      };
    });

  const totalResponses = responses.length;

  const averagePurchaseIntent =
    totalResponses > 0
      ? responses.reduce(
          (sum, response) =>
            sum + response.purchase_intent,
          0,
        ) / totalResponses
      : 0;

  const wouldBuyCount = responses.filter(
    (response) => response.would_buy,
  ).length;

  const wouldConsiderCount = responses.filter(
    (response) =>
      !response.would_buy &&
      response.would_consider,
  ).length;

  const rejectedCount = responses.filter(
    (response) =>
      !response.would_buy &&
      !response.would_consider,
  ).length;

  const objectionCounts = new Map<
    string,
    number
  >();

  responses.forEach((response) => {
    const objection =
      response.primary_objection.trim();

    if (!objection) {
      return;
    }

    objectionCounts.set(
      objection,
      (objectionCounts.get(objection) ?? 0) + 1,
    );
  });

  const topObjections: ObjectionResult[] =
    Array.from(objectionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({
        label,
        percentage: calculatePercentage(
          count,
          totalResponses,
        ),
      }));

  const positiveFactorCounts = new Map<
    string,
    number
  >();

  responses.forEach((response) => {
    response.positive_factors.forEach(
      (factor) => {
        const cleanFactor = factor.trim();

        if (!cleanFactor) {
          return;
        }

        positiveFactorCounts.set(
          cleanFactor,
          (positiveFactorCounts.get(cleanFactor) ??
            0) + 1,
        );
      },
    );
  });

  const strongestSignals: SignalResult[] =
    Array.from(positiveFactorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([title, count]) => ({
        title,
        description: `${calculatePercentage(
          count,
          totalResponses,
        )}% of responding customers identified this as a positive factor.`,
      }));

  if (strongestSignals.length === 0) {
    strongestSignals.push({
      title: "Customer relevance",
      description:
        "Customers responded to the concept based on their individual simulated profiles.",
    });
  }

  const archetypeMap = new Map<
    string,
    CustomerResponse[]
  >();

  enrichedResponses.forEach((response) => {
    const existing =
      archetypeMap.get(response.archetype) ?? [];

    existing.push(response);

    archetypeMap.set(
      response.archetype,
      existing,
    );
  });

  const archetypes: ArchetypeResult[] =
    Array.from(archetypeMap.entries())
      .map(([name, archetypeResponses]) => {
        const interest =
          archetypeResponses.reduce(
            (sum, response) =>
              sum + response.overall_interest,
            0,
          ) / archetypeResponses.length;

        const purchaseIntent =
          archetypeResponses.reduce(
            (sum, response) =>
              sum + response.purchase_intent,
            0,
          ) / archetypeResponses.length;

        return {
          name,
          customers: archetypeResponses.length,
          interest: Math.round(interest * 10),
          purchaseIntent: Math.round(
            purchaseIntent * 10,
          ),
        };
      })
      .sort(
        (a, b) =>
          b.purchaseIntent - a.purchaseIntent,
      );

  let takeaway: Takeaway;

  if (averagePurchaseIntent >= 7) {
    takeaway = {
      headline:
        "Strong customer purchase signal.",
      supportingText:
        "The simulated audience shows meaningful purchase intent, suggesting the concept has a strong foundation to test further.",
    };
  } else if (averagePurchaseIntent >= 5) {
    takeaway = {
      headline:
        "The concept shows promising customer interest.",
      supportingText:
        "Customers see value in the concept, but the current proposition does not consistently convert interest into purchase intent.",
    };
  } else {
    takeaway = {
      headline:
        "The concept needs stronger customer validation.",
      supportingText:
        "Customer interest is limited, suggesting the value proposition, positioning or offer may need refinement.",
    };
  }

  return {
    totalCustomers: result.total_customers,
    completedCustomers:
      result.completed_customers,
    failedCustomers: result.failed_customers,
    overallPurchaseIntent:
      roundToOneDecimal(
        averagePurchaseIntent,
      ),
    wouldBuyPercentage: calculatePercentage(
      wouldBuyCount,
      totalResponses,
    ),
    wouldConsiderPercentage: calculatePercentage(
      wouldConsiderCount,
      totalResponses,
    ),
    rejectedPercentage: calculatePercentage(
      rejectedCount,
      totalResponses,
    ),
    topObjections,
    strongestSignals,
    archetypes,
    previewCustomers:
      enrichedResponses.slice(0, 6),
    takeaway,
  };
}

export default function ResultsPage() {
  const storedSimulation =
    useSyncExternalStore(
      subscribeToStorage,
      getStoredSimulation,
      () => null,
    );

  let simulation: StoredSimulation | null =
    null;

  if (storedSimulation) {
    try {
      simulation = JSON.parse(
        storedSimulation,
      ) as StoredSimulation;
    } catch {
      simulation = null;
    }
  }

  const [customers, setCustomers] = useState<
    CustomerProfile[]
  >([]);

  const [isLoadingCustomers, setIsLoadingCustomers] =
    useState(true);

  const [customerLoadError, setCustomerLoadError] =
    useState("");

  useEffect(() => {
    async function loadCustomers() {
      try {
        const response = await fetch(
          "http://localhost:8000/customers",
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load customer profiles.",
          );
        }

        const data = await response.json();

        setCustomers(data.customers);
      } catch (error) {
        console.error(
          "Failed to load customer profiles:",
          error,
        );

        setCustomerLoadError(
          "Unable to load customer profile details.",
        );
      } finally {
        setIsLoadingCustomers(false);
      }
    }

    loadCustomers();
  }, []);

  if (!simulation) {
    return (
      <main className="results-shell">
        <nav className="results-topbar">
          <Link href="/" className="brand">
            <div className="brand-mark">C</div>
            <span>arnabela</span>
          </Link>
        </nav>

        <section className="empty-results">
          <p className="section-label">
            NO TEST FOUND
          </p>

          <h1>Start a customer test first.</h1>

          <p>
            Enter a product, offer or concept and run it
            through arnabela before viewing the
            results.
          </p>

          <Link
            href="/"
            className="back-button"
          >
            RUN A TEST →
          </Link>
        </section>
      </main>
    );
  }

  if (isLoadingCustomers) {
    return (
      <main className="results-shell">
        <nav className="results-topbar">
          <Link href="/" className="brand">
            <div className="brand-mark">C</div>
            <span>arnabela</span>
          </Link>

          <div className="results-nav">
            <span className="status-dot" />
            Loading results
          </div>
        </nav>

        <section className="empty-results">
          <p className="section-label">
            ARNABELA
          </p>

          <h1>Preparing your results.</h1>

          <p>
            Loading the simulated customer profiles and
            matching their responses.
          </p>
        </section>
      </main>
    );
  }

  const analysis =
    analyseBackendSimulation(
      simulation,
      customers,
    );

  return (
    <main className="results-shell">
      <nav className="results-topbar">
        <Link href="/" className="brand">
          <div className="brand-mark">C</div>
          <span>arnabela</span>
        </Link>

        <div className="results-nav">
          <span className="status-dot" />
          Simulation complete
        </div>
      </nav>

      <section className="results-header">
        <div>
          <p className="section-label">
            {simulation.testType.toUpperCase()} ·
            SIMULATION RESULTS
          </p>

          <h1>{simulation.productName}</h1>

          <p className="results-description">
            Tested against {analysis.totalCustomers}{" "}
            distinct simulated AI customers.
          </p>

          <p className="results-target">
            Target market:{" "}
            {simulation.targetMarket}
          </p>
        </div>

        <div className="test-meta">
          <div>
            <span>TESTED</span>

            <strong>
              {analysis.totalCustomers}
            </strong>

            <small>customers</small>
          </div>

          <div>
            <span>STATUS</span>

            <strong>
              {analysis.totalCustomers > 0
                ? calculatePercentage(
                    analysis.completedCustomers,
                    analysis.totalCustomers,
                  )
                : 0}
              %
            </strong>

            <small>completed</small>
          </div>
        </div>
      </section>

      <section className="verdict-card">
        <div className="verdict-main">
          <p className="section-label">
            OVERALL CUSTOMER SIGNAL
          </p>

          <div className="verdict-score">
            <strong>
              {analysis.overallPurchaseIntent}
            </strong>

            <span>/ 10</span>
          </div>

          <h2>
            {analysis.takeaway.headline}
          </h2>

          <p>
            {analysis.takeaway.supportingText}
          </p>
        </div>

        <div className="verdict-stats">
          <div>
            <strong>
              {analysis.wouldConsiderPercentage}%
            </strong>

            <span>Would consider</span>
          </div>

          <div>
            <strong>
              {analysis.wouldBuyPercentage}%
            </strong>

            <span>Would buy</span>
          </div>

          <div>
            <strong>
              {analysis.rejectedPercentage}%
            </strong>

            <span>Rejected</span>
          </div>
        </div>
      </section>

      <section className="results-grid">
        <div className="result-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">
                WHAT CUSTOMERS LIKE
              </p>

              <h2>Strongest signals</h2>
            </div>
          </div>

          <div className="signal-list">
            {analysis.strongestSignals.map(
              (signal, index) => (
                <div
                  className="signal"
                  key={signal.title}
                >
                  <span className="signal-number">
                    {String(index + 1).padStart(
                      2,
                      "0",
                    )}
                  </span>

                  <div>
                    <strong>
                      {signal.title}
                    </strong>

                    <p>
                      {signal.description}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="result-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">
                TOP OBJECTIONS
              </p>

              <h2>
                Why customers hesitate
              </h2>
            </div>
          </div>

          <div className="objection-list">
            {analysis.topObjections.map(
              (objection) => (
                <div
                  className="objection"
                  key={objection.label}
                >
                  <div className="objection-top">
                    <span>
                      {objection.label}
                    </span>

                    <strong>
                      {objection.percentage}%
                    </strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${objection.percentage}%`,
                      }}
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="archetype-panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">
              CUSTOMER SEGMENTS
            </p>

            <h2>
              How different customers responded
            </h2>
          </div>

          <span className="segment-count">
            {analysis.archetypes.length} segments ·{" "}
            {analysis.totalCustomers} customers
          </span>
        </div>

        <div className="archetype-table">
          <div className="table-row table-header">
            <span>Customer type</span>
            <span>Customers</span>
            <span>Interest</span>
            <span>Purchase intent</span>
          </div>

          {analysis.archetypes.map(
            (archetype) => (
              <div
                className="table-row"
                key={archetype.name}
              >
                <span className="archetype-name">
                  {archetype.name}
                </span>

                <span>
                  {archetype.customers}
                </span>

                <span>
                  <b>
                    {archetype.interest}%
                  </b>
                </span>

                <span>
                  <b>
                    {archetype.purchaseIntent}%
                  </b>
                </span>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="insight-banner">
        <div>
          <p className="section-label">
            ARNABELA TAKEAWAY
          </p>

          <h2>
            {analysis.takeaway.headline}
            <br />

            <span>
              {analysis.takeaway.supportingText}
            </span>
          </h2>
        </div>

        <div className="insight-arrow">
          →
        </div>
      </section>

      <section className="customer-preview">
        <div className="panel-heading">
          <div>
            <p className="section-label">
              INDIVIDUAL RESPONSES
            </p>

            <h2>
              Meet the simulated customers
            </h2>
          </div>

          <span className="segment-count">
            Showing{" "}
            {analysis.previewCustomers.length} of{" "}
            {analysis.totalCustomers}
          </span>
        </div>

        {customerLoadError && (
          <p className="error-message">
            {customerLoadError}
          </p>
        )}

        <div className="customer-cards">
          {analysis.previewCustomers.map(
            (customer) => (
              <div
                className="customer-card"
                key={customer.customer_id}
              >
                <div className="customer-avatar">
                  {customer.name.charAt(0)}
                </div>

                <div className="customer-card-info">
                  <strong>
                    {customer.name}
                  </strong>

                  <span>
                    {customer.archetype}
                  </span>
                </div>

                <div className="customer-card-score">
                  <strong>
                    {customer.purchase_intent}
                  </strong>

                  <span>/10</span>
                </div>

                <div
                  className={`decision ${
                    customer.would_buy
                      ? "positive"
                      : ""
                  }`}
                >
                  {customer.would_buy
                    ? "Would buy"
                    : customer.would_consider
                      ? "Would consider"
                      : "Would not buy"}
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      <footer className="results-footer">
        <span>arnabela</span>

        <span>
          Simulated AI customers · Not human market
          research
        </span>

        <Link href="/">
          Run another test →
        </Link>
      </footer>
    </main>
  );
}