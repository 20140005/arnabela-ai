"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  analyseSimulation,
  type SimulationAnalysis,
  type SimulationInput,
} from "../../lib/simulationAnalysis";

export default function ResultsPage() {
  const storedSimulation =
  useSyncExternalStore(
    () => () => {},
    () =>
      sessionStorage.getItem(
        "customerLabSimulation"
      ),
    () => null
  );

let simulation: SimulationInput | null = null;

if (storedSimulation) {
  try {
    simulation = JSON.parse(
      storedSimulation
    ) as SimulationInput;
  } catch {
    simulation = null;
  }
}

const analysis: SimulationAnalysis | null =
  simulation
    ? analyseSimulation(simulation)
    : null;

  if (!simulation || !analysis) {
    return (
      <main className="results-shell">
        <nav className="results-topbar">
          <Link href="/" className="brand">
            <div className="brand-mark">C</div>
            <span>Customer Lab</span>
          </Link>
        </nav>

        <section className="empty-results">
          <p className="section-label">
            NO TEST FOUND
          </p>

          <h1>Start a customer test first.</h1>

          <p>
            Enter a product, offer or concept and run it
            through Customer Lab before viewing the
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

  const previewCustomers =
    analysis.responses.slice(0, 6);

  return (
    <main className="results-shell">
      <nav className="results-topbar">
        <Link href="/" className="brand">
          <div className="brand-mark">C</div>
          <span>Customer Lab</span>
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
            Target market: {simulation.targetMarket}
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
            <strong>100%</strong>
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
                      "0"
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
              )
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
              )
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
            10 segments ·{" "}
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
            )
          )}
        </div>
      </section>

      <section className="insight-banner">
        <div>
          <p className="section-label">
            CUSTOMER LAB TAKEAWAY
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
            Showing {previewCustomers.length} of{" "}
            {analysis.totalCustomers}
          </span>
        </div>

        <div className="customer-cards">
          {previewCustomers.map(
            (customer) => (
              <div
                className="customer-card"
                key={customer.customerId}
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
                    {customer.purchaseIntent}
                  </strong>

                  <span>/10</span>
                </div>

                <div
                  className={`decision ${
                    customer.wouldBuy
                      ? "positive"
                      : ""
                  }`}
                >
                  {customer.wouldBuy
                    ? "Would buy"
                    : customer.wouldConsider
                      ? "Would consider"
                      : "Would not buy"}
                </div>
              </div>
            )
          )}
        </div>
      </section>

      <footer className="results-footer">
        <span>Customer Lab</span>

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