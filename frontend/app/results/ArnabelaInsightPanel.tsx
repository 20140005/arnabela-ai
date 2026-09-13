"use client";

import Link from "next/link";

import {
  buildNextTestDraft,
  type ArnabelaInsight,
} from "@/lib/arnabelaInsight";
import {
  storeNextTestDraft,
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
  function persistRecommendation() {
    storeNextTestDraft(
      buildNextTestDraft(
        {
          productName: simulation.productName,
          testType: simulation.testType,
          description: simulation.description,
          price: simulation.price,
          targetMarket: simulation.targetMarket,
          keyFeatures: simulation.keyFeatures ?? [],
        },
        insight,
      ),
    );
  }

  return (
    <section className="insight-panel">
      <p className="section-label">✦ ARNABELA INSIGHT</p>

      <h2>{insight.headline}</h2>

      <p className="insight-explanation">{insight.explanation}</p>

      <div className="insight-blocks">
        <div className="insight-block">
          <p className="section-label">BIGGEST OPPORTUNITY</p>
          <p>{insight.opportunity}</p>
        </div>

        <div className="insight-block">
          <p className="section-label">BIGGEST BARRIER</p>
          <p>{insight.barrier}</p>
        </div>
      </div>

      <div className="insight-next">
        <p className="section-label">RECOMMENDED NEXT TEST</p>
        <p>{insight.nextExperiment}</p>
      </div>

      <Link
        href="/"
        className="insight-test-button"
        onClick={persistRecommendation}
      >
        <span>TEST THIS RECOMMENDATION</span>
        <span className="arrow">→</span>
      </Link>
    </section>
  );
}
