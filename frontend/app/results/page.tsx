"use client";

import Link from "next/link";

import AppShell from "@/components/layout/AppShell";
import {
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import ArnabelaInsightPanel from "./ArnabelaInsightPanel";
import CustomerExplorer from "./CustomerExplorer";
import DecisionDriversPanel from "./DecisionDriversPanel";
import {
  buildArnabelaInsight,
  type ArnabelaInsight,
} from "@/lib/arnabelaInsight";
import {
  selectPreviewCustomers,
  decisionFromResponse,
  type PreviewCustomer,
} from "@/lib/customerExplorer";
import {
  buildDecisionDrivers,
  calculatePercentage,
  type DecisionDriversResult,
} from "@/lib/decisionDrivers";
import { formatPrice } from "@/lib/presentation";
import {
  SIMULATION_RESULT_KEY,
  getCustomerById,
  getCustomers,
  subscribeToSessionStore,
  type CustomerProfile,
  type CustomerResponse,
  type StoredSimulation,
} from "@/lib/simulationClient";

type ArchetypeResult = {
  name: string;
  customers: number;
  interest: number;
  purchaseIntent: number;
};

type Analysis = {
  totalCustomers: number;
  completedCustomers: number;
  failedCustomers: number;
  overallPurchaseIntent: number;
  wouldBuyPercentage: number;
  wouldConsiderPercentage: number;
  rejectedPercentage: number;
  drivers: DecisionDriversResult;
  archetypes: ArchetypeResult[];
  previewCustomers: PreviewCustomer[];
  insight: ArnabelaInsight;
};

function getStoredSimulation() {
  return sessionStorage.getItem(
    SIMULATION_RESULT_KEY,
  );
}

function subscribeToStorage(onStoreChange: () => void) {
  return subscribeToSessionStore(onStoreChange);
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function averageScore(
  responses: CustomerResponse[],
  key:
    | "overall_interest"
    | "understanding"
    | "trust"
    | "price_acceptance",
) {
  if (responses.length === 0) {
    return 0;
  }

  const total = responses.reduce(
    (sum, response) => sum + response[key],
    0,
  );

  return roundToOneDecimal(total / responses.length);
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
      {
        name: customer.name,
        archetype: customer.archetype,
      },
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

  const drivers = buildDecisionDrivers(
    responses,
    customerMap,
    {
      totalCustomers: result.total_customers,
      failedCustomers: result.failed_customers,
    },
  );

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

  const overallPurchaseIntent = roundToOneDecimal(
    averagePurchaseIntent,
  );
  const wouldBuyPercentage = calculatePercentage(
    wouldBuyCount,
    totalResponses,
  );
  const wouldConsiderPercentage = calculatePercentage(
    wouldConsiderCount,
    totalResponses,
  );
  const rejectedPercentage = calculatePercentage(
    rejectedCount,
    totalResponses,
  );

  const topArchetype = archetypes[0]
    ? {
        name: archetypes[0].name,
        customers: archetypes[0].customers,
        purchaseIntent: roundToOneDecimal(
          archetypes[0].purchaseIntent / 10,
        ),
      }
    : null;

  const insight = buildArnabelaInsight({
    respondingCustomers: totalResponses,
    overallPurchaseIntent,
    wouldBuyPercentage,
    wouldConsiderPercentage,
    rejectedPercentage,
    averageInterest: averageScore(
      responses,
      "overall_interest",
    ),
    averageUnderstanding: averageScore(
      responses,
      "understanding",
    ),
    averageTrust: averageScore(responses, "trust"),
    averagePriceAcceptance: averageScore(
      responses,
      "price_acceptance",
    ),
    positiveDrivers: drivers.positive,
    negativeDrivers: drivers.negative,
    topArchetype,
  });

  return {
    totalCustomers: result.total_customers,
    completedCustomers:
      result.completed_customers,
    failedCustomers: result.failed_customers,
    overallPurchaseIntent,
    wouldBuyPercentage,
    wouldConsiderPercentage,
    rejectedPercentage,
    drivers,
    archetypes,
    previewCustomers: selectPreviewCustomers(
      responses,
      customerMap,
      6,
    ),
    insight,
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

  const [selectedCustomerId, setSelectedCustomerId] =
    useState<string | null>(null);

  const [fetchedProfile, setFetchedProfile] = useState<{
    customerId: string;
    profile: CustomerProfile | null;
  } | null>(null);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const loaded = await getCustomers();
        setCustomers(loaded);
      } catch (error) {
        console.error(
          "Failed to load customer profiles:",
          error,
        );

        setCustomers([]);
        setCustomerLoadError(
          "Unable to load customer profile details.",
        );
      } finally {
        setIsLoadingCustomers(false);
      }
    }

    loadCustomers();
  }, []);

  const selectedProfileFromList =
    customers.find(
      (customer) => customer.id === selectedCustomerId,
    ) ?? null;

  useEffect(() => {
    if (!selectedCustomerId || selectedProfileFromList) {
      return;
    }

    const requestedId = selectedCustomerId;
    let cancelled = false;

    getCustomerById(requestedId)
      .then((profile) => {
        if (!cancelled) {
          setFetchedProfile({
            customerId: requestedId,
            profile,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchedProfile({
            customerId: requestedId,
            profile: null,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCustomerId, selectedProfileFromList]);

  if (!simulation) {
    return (
      <AppShell status="No results yet">
      <main className="results-shell">

        <section className="empty-results">
          <p className="section-label">
            Results
          </p>

          <h1>Start a test first.</h1>

          <p>
            Enter a product, offer or concept and run it
            through Arnabela before viewing the results.
          </p>

          <Link
            href="/"
            className="back-button"
          >
            New test →
          </Link>
        </section>
      </main>
      </AppShell>
    );
  }

  if (isLoadingCustomers) {
    return (
      <AppShell status="Building the signal">
      <main className="results-shell">

        <section className="empty-results">
          <p className="section-label">
            Results
          </p>

          <h1>Building the audience signal.</h1>

          <p>
            Loading simulated customer profiles and
            matching their responses.
          </p>
        </section>
      </main>
      </AppShell>
    );
  }

  const analysis =
    analyseBackendSimulation(
      simulation,
      customers,
    );

  const selectedCustomer =
    analysis.previewCustomers.find(
      (customer) =>
        customer.customer_id === selectedCustomerId,
    ) ?? null;

  const resolvedProfile =
    selectedProfileFromList ??
    (fetchedProfile?.customerId === selectedCustomerId
      ? fetchedProfile.profile
      : null);

  const priceLabel =
    typeof simulation.price === "number" && simulation.price > 0
      ? formatPrice(simulation.price)
      : null;

  return (
    <AppShell status="Results ready">
    <main className="results-shell">

      <section className="results-header">
        <div>
          <p className="section-label">
            Results · {simulation.testType}
          </p>

          <h1>{simulation.productName}</h1>

          <p className="results-description">
            {[priceLabel, simulation.targetMarket]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <p className="results-target">
            {analysis.completedCustomers} of{" "}
            {analysis.totalCustomers} simulated perspectives
            responded.
          </p>

          {analysis.failedCustomers > 0 && (
            <p className="results-target">
              {analysis.failedCustomers}{" "}
              {analysis.failedCustomers === 1
                ? "perspective did not complete and is"
                : "perspectives did not complete and are"}{" "}
              excluded from the decision totals.
            </p>
          )}
        </div>

        <div className="test-meta">
          <div>
            <span>Audience</span>

            <strong>
              {analysis.totalCustomers}
            </strong>

            <small>perspectives</small>
          </div>

          <div>
            <span>Completion</span>

            <strong>
              {analysis.totalCustomers > 0
                ? calculatePercentage(
                    analysis.completedCustomers,
                    analysis.totalCustomers,
                  )
                : 0}
              %
            </strong>

            <small>captured</small>
          </div>
        </div>
      </section>

      <section className="verdict-card">
        <div className="verdict-main">
          <p className="section-label">
            The signal
          </p>

          <div className="verdict-score">
            <strong>
              {analysis.wouldBuyPercentage}%
            </strong>

            <span>Would buy</span>
          </div>

          <p>
            Across {analysis.completedCustomers} responding
            perspectives in this test.
          </p>
        </div>

        <div className="verdict-stats">
          <div className="stat-buy">
            <strong>
              {analysis.wouldBuyPercentage}%
            </strong>

            <span>Would buy</span>
          </div>

          <div className="stat-consider">
            <strong>
              {analysis.wouldConsiderPercentage}%
            </strong>

            <span>Would consider</span>
          </div>

          <div className="stat-reject">
            <strong>
              {analysis.rejectedPercentage}%
            </strong>

            <span>Would not buy</span>
          </div>
        </div>
      </section>

      <ArnabelaInsightPanel
        insight={analysis.insight}
        simulation={simulation}
      />

      <DecisionDriversPanel drivers={analysis.drivers} />

      <section className="archetype-panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">
              Audience
            </p>

            <h2>
              How different customers responded
            </h2>
          </div>

          <span className="segment-count">
            {analysis.archetypes.length} segments ·{" "}
            {analysis.completedCustomers} responding
          </span>
        </div>

        {analysis.archetypes.length === 0 ? (
          <p className="driver-empty">
            No completed customer responses were available
            to group into segments.
          </p>
        ) : (
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
        )}
      </section>

      <section className="customer-preview">
        <div className="panel-heading">
          <div>
            <p className="section-label">
              Explore the audience
            </p>

            <h2>
              See how individual perspectives shaped the result
            </h2>

            <p className="explorer-hint">
              Select a customer to inspect their decision.
              Simulated perspectives · Not human market research.
            </p>
          </div>

          <span className="segment-count">
            Showing{" "}
            {analysis.previewCustomers.length} of{" "}
            {analysis.completedCustomers}
          </span>
        </div>

        {customerLoadError && (
          <p className="error-message">
            {customerLoadError}
          </p>
        )}

        {analysis.previewCustomers.length === 0 && (
          <p className="driver-empty">
            No individual customer responses are available
            to explore.
          </p>
        )}

        <div className="customer-cards">
          {analysis.previewCustomers.map(
            (customer) => {
              const decision =
                decisionFromResponse(customer);

              return (
                <button
                  type="button"
                  className={`customer-card ${
                    selectedCustomerId ===
                    customer.customer_id
                      ? "selected"
                      : ""
                  }`}
                  key={customer.customer_id}
                  onClick={() =>
                    setSelectedCustomerId(
                      customer.customer_id,
                    )
                  }
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
                    className={`decision ${decision.toLowerCase()}`}
                  >
                    {decision}
                  </div>
                </button>
              );
            },
          )}
        </div>
      </section>

      {selectedCustomer && (
        <CustomerExplorer
          customer={selectedCustomer}
          profile={resolvedProfile}
          productPrice={simulation.price}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}

      <footer className="results-footer">
        <span>Arnabela</span>

        <span>
          Simulated perspectives · Not human market research
        </span>

        <Link href="/">
          Run another test →
        </Link>
      </footer>
    </main>
    </AppShell>
  );
}