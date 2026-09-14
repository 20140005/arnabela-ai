"use client";

import Link from "next/link";

import type { ArnabelaInsight } from "@/lib/arnabelaInsight";
import { createComparisonSession } from "@/lib/comparisonSession";
import {
  storeComparisonSession,
  type StoredSimulation,
} from "@/lib/simulationClient";

type ArnabelaInsightPanelProps = {
  insight: ArnabelaInsight;
  simulation: StoredSimulation;
};

export default function ArnabelaInsightPanel({
  insight,
  simulation,
}: ArnabelaInsightPanelProps) {
  const recommendation = insight.recommendation;
  const canTest =
    recommendation?.canApply !== false &&
    recommendation?.type !== "NO_CLEAR_VARIANT";
  const evidence = recommendation?.evidence ?? [];

  function persistRecommendation() {
    storeComparisonSession(
      createComparisonSession(simulation, insight),
    );
  }

  return (
    <section className="insight-panel">
      <p className="section-label">What we learned</p>

      <h2>{insight.headline}</h2>

      <p className="insight-explanation">{insight.explanation}</p>

      <div className="insight-blocks">
        <div className="insight-block">
          <p className="section-label">What this means</p>
          <p>{insight.opportunity}</p>
        </div>

        <div className="insight-block">
          <p className="section-label">Biggest barrier</p>
          <p>{insight.barrier}</p>
        </div>
      </div>

      <div className="insight-next">
        <p className="section-label">What to test next</p>
        <h3 className="insight-recommendation-title">
          {recommendation?.title ?? "What to test next"}
        </h3>
        <p>
          {recommendation?.rationale ??
            recommendation?.reason ??
            insight.nextExperiment}
        </p>
        <p className="insight-prepared-note">
          {recommendation?.nextExperiment ?? insight.nextExperiment}
        </p>

        {evidence.length > 0 && (
          <div className="insight-evidence">
            <p className="section-label">Based on</p>
            <ul>
              {evidence.map((item) => (
                <li key={`${item.metric}-${item.label}`}>
                  <strong>{item.label}</strong>
                  <span>{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canTest ? (
          <p className="insight-prepared-note">
            Arnabela has prepared a Version 2 for you based on this
            evidence. Review the change before testing it against the
            same audience.
          </p>
        ) : (
          <p className="insight-prepared-note">
            {recommendation?.applyBlockReason ??
              "The current simulation does not show a strong enough signal for Arnabela to recommend one specific change."}
          </p>
        )}
      </div>

      {canTest ? (
        <Link
          href="/compare"
          className="insight-test-button"
          onClick={persistRecommendation}
        >
          <span>Test Arnabela&apos;s recommendation</span>
          <span className="arrow">→</span>
        </Link>
      ) : (
        <Link
          href="/"
          className="insight-test-button insight-test-button-secondary"
        >
          <span>Create your own variant</span>
          <span className="arrow">→</span>
        </Link>
      )}
    </section>
  );
}
