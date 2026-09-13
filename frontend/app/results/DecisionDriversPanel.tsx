"use client";

import { useState } from "react";

import type {
  DecisionDriver,
  DecisionDriversResult,
} from "@/lib/decisionDrivers";

type DecisionDriversPanelProps = {
  drivers: DecisionDriversResult;
};

function denominatorLabel(drivers: DecisionDriversResult) {
  const responding =
    drivers.respondingCustomers === 1
      ? "1 responding perspective"
      : `${drivers.respondingCustomers} responding perspectives`;

  if (drivers.failedCustomers > 0) {
    const failed =
      drivers.failedCustomers === 1
        ? "1 did not complete"
        : `${drivers.failedCustomers} did not complete`;

    return `Based on ${responding} · ${failed}`;
  }

  return `Based on ${responding}`;
}

function DriverList({
  title,
  heading,
  empty,
  drivers,
  kind,
}: {
  title: string;
  heading: string;
  empty: string;
  drivers: DecisionDriver[];
  kind: "positive" | "negative";
}) {
  const [expandedId, setExpandedId] = useState<string | null>(
    null,
  );

  return (
    <div className="result-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">{title}</p>
          <h2>{heading}</h2>
        </div>
      </div>

      {drivers.length === 0 ? (
        <p className="driver-empty">{empty}</p>
      ) : (
        <div className="driver-list">
          {drivers.map((driver) => {
            const expanded = expandedId === driver.id;

            return (
              <div
                className="driver"
                key={`${kind}-${driver.id}`}
              >
                <button
                  type="button"
                  className="driver-toggle"
                  aria-expanded={expanded}
                  onClick={() =>
                    setExpandedId(
                      expanded ? null : driver.id,
                    )
                  }
                >
                  <div className="driver-top">
                    <span>{driver.label}</span>
                    <strong>
                      {driver.count} · {driver.percentage}%
                    </strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className={`progress-fill ${
                        kind === "negative"
                          ? "progress-fill-negative"
                          : ""
                      }`}
                      style={{
                        width: `${driver.percentage}%`,
                      }}
                    />
                  </div>
                </button>

                {expanded && (
                  <div className="driver-detail">
                    <p>
                      {driver.count}{" "}
                      {driver.count === 1
                        ? "customer"
                        : "customers"}{" "}
                      mentioned this.
                    </p>

                    {driver.archetypes.length > 0 && (
                      <div>
                        <p className="section-label">
                          MOST AFFECTED
                        </p>
                        <ul>
                          {driver.archetypes.map(
                            (archetype) => (
                              <li key={archetype.name}>
                                {archetype.name}
                                <span>
                                  {archetype.count}
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {driver.representatives.length > 0 && (
                      <div>
                        <p className="section-label">
                          REPRESENTATIVE RESPONSES
                        </p>
                        <ul className="driver-quotes">
                          {driver.representatives.map(
                            (customer) => (
                              <li key={customer.customer_id}>
                                <strong>
                                  {customer.name}
                                </strong>
                                <span>
                                  {customer.archetype}
                                </span>
                                <p>{customer.excerpt}</p>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DecisionDriversPanel({
  drivers,
}: DecisionDriversPanelProps) {
  return (
    <section className="drivers-section">
      <div className="panel-heading">
        <div>
          <p className="section-label">Why</p>
          <h2>Why they said yes — and why they didn&apos;t</h2>
        </div>

        <span className="segment-count">
          {denominatorLabel(drivers)}
        </span>
      </div>

      <div className="results-grid">
        <DriverList
          title="Pulled customers in"
          heading="What attracted the audience"
          empty="Responding customers did not return any positive factors."
          drivers={drivers.positive}
          kind="positive"
        />
        <DriverList
          title="Pushed customers away"
          heading="What held the audience back"
          empty="Responding customers did not return any primary objections."
          drivers={drivers.negative}
          kind="negative"
        />
      </div>
    </section>
  );
}
