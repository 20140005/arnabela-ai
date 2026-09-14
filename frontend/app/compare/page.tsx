"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import AppShell from "@/components/layout/AppShell";
import {
  buildComparisonResult,
  describeChangedFields,
  type ComparisonResult,
} from "@/lib/comparison";
import { formatPrice } from "@/lib/presentation";
import {
  COMPARISON_SESSION_KEY,
  clearComparisonSession,
  getCustomers,
  getSimulationJob,
  startSimulationJob,
  storeComparisonSession,
  storeComparisonVariantResult,
  subscribeToSessionStore,
  type ComparisonSession,
  type ComparisonVariantDraft,
  type CustomerProfile,
  type StoredSimulation,
} from "@/lib/simulationClient";

const POLL_MS = 300;

function subscribe(onStoreChange: () => void) {
  return subscribeToSessionStore(onStoreChange);
}

function getSnapshot() {
  return sessionStorage.getItem(COMPARISON_SESSION_KEY);
}

function parseSession(raw: string | null): ComparisonSession | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ComparisonSession;
  } catch {
    return null;
  }
}

function formatPoints(points: number) {
  const rounded = Math.round(points * 10) / 10;
  if (rounded > 0) {
    return `+${rounded} pts`;
  }
  if (rounded < 0) {
    return `${rounded} pts`;
  }
  return "0 pts";
}

function SplitBlock({
  title,
  label,
  price,
  buy,
  consider,
  reject,
}: {
  title: string;
  label: string;
  price: number;
  buy: number;
  consider: number;
  reject: number;
}) {
  return (
    <article className="versus-version">
      <p className="section-label">{title}</p>
      <h3>{label}</h3>
      <p className="versus-price">{formatPrice(price)}</p>
      <div className="versus-split">
        <div className="stat-buy">
          <strong>{buy}%</strong>
          <span>Buy</span>
        </div>
        <div className="stat-consider">
          <strong>{consider}%</strong>
          <span>Consider</span>
        </div>
        <div className="stat-reject">
          <strong>{reject}%</strong>
          <span>Reject</span>
        </div>
      </div>
    </article>
  );
}

export default function ComparePage() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const session = parseSession(raw);

  const [draftOverride, setDraftOverride] =
    useState<ComparisonVariantDraft | null>(null);
  const [appliedRaw, setAppliedRaw] = useState(raw);
  const [profiles, setProfiles] = useState<CustomerProfile[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [showManualEdit, setShowManualEdit] = useState(false);

  if (raw !== appliedRaw) {
    setAppliedRaw(raw);
    setDraftOverride(null);
    setShowManualEdit(false);
  }

  const draft = draftOverride ?? session?.variantDraft ?? null;

  function updateDraft(next: ComparisonVariantDraft) {
    setDraftOverride(next);
  }

  useEffect(() => {
    let cancelled = false;

    void getCustomers()
      .then((customers) => {
        if (!cancelled) {
          setProfiles(customers);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfiles([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const comparison: ComparisonResult | null = useMemo(() => {
    if (!session?.variant) {
      return null;
    }

    return buildComparisonResult({
      original: session.baseline,
      variant: session.variant,
      profiles,
    });
  }, [session, profiles]);

  const changes = useMemo(() => {
    if (!session || !draft) {
      return [];
    }

    if (draft.changeSummary?.length) {
      return draft.changeSummary.filter((item) => item.changed);
    }

    return describeChangedFields(session.baseline, draft).map((item) => ({
      field: item.field,
      from: item.from,
      to: item.to,
      changed: true,
    }));
  }, [session, draft]);

  async function runComparison() {
    if (!session || !draft || isRunning) {
      return;
    }

    if (draft.canApply === false && !showManualEdit) {
      setError(
        draft.applyBlockReason ||
          "Arnabela could not safely prepare an automated Version 2.",
      );
      return;
    }

    if (session.customerIds.length === 0) {
      setError(
        "The original test has no customer IDs to retest. Run a complete test first.",
      );
      return;
    }

    setError("");
    setIsRunning(true);
    setProgress("Starting Version 2…");

    try {
      const job = await startSimulationJob({
        product_name: draft.productName.trim(),
        description: draft.description.trim(),
        price: Number(draft.price),
        key_features: draft.keyFeatures,
        target_market: draft.targetMarket.trim(),
        customer_ids: session.customerIds,
      });

      storeComparisonSession({
        ...session,
        variantDraft: draft,
        variant: null,
        variantJobId: job.job_id,
      });

      let snapshot = job;

      while (
        snapshot.status !== "completed" &&
        snapshot.status !== "failed"
      ) {
        setProgress(
          `Retesting the same audience… ${snapshot.completed_customers + snapshot.failed_customers} / ${snapshot.total_customers}`,
        );
        await new Promise((resolve) => window.setTimeout(resolve, POLL_MS));
        snapshot = await getSimulationJob(job.job_id);
      }

      if (snapshot.status === "failed" || !snapshot.result) {
        throw new Error(
          snapshot.error || "Version 2 could not be completed.",
        );
      }

      const variant: StoredSimulation = {
        testId: snapshot.result.test_id,
        productName: draft.productName.trim(),
        testType: draft.testType,
        description: draft.description.trim(),
        price: Number(draft.price),
        targetMarket: draft.targetMarket.trim(),
        keyFeatures: draft.keyFeatures,
        backendResult: snapshot.result,
      };

      storeComparisonVariantResult(variant);
      setProgress("");
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : "Unable to run the comparison.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  if (!session || !draft) {
    return (
      <AppShell status="No comparison yet">
        <main className="page-shell compare-shell">
          <section className="empty-results">
            <p className="section-label">Versus</p>
            <h1>Test a recommendation first.</h1>
            <p>
              Open Results, review what to test next, then choose
              “Test Arnabela&apos;s recommendation” to prepare Version 2
              for the same audience.
            </p>
            <Link href="/results" className="back-button">
              Go to results →
            </Link>
          </section>
        </main>
      </AppShell>
    );
  }

  const baseline = session.baseline;
  const hasVariant = Boolean(session.variant && comparison);
  const summaryRows =
    draft.changeSummary?.length > 0
      ? draft.changeSummary
      : [
          {
            field: "Price",
            from: formatPrice(baseline.price),
            to: formatPrice(draft.price),
            changed: baseline.price !== draft.price,
          },
          {
            field: "Description",
            from: baseline.description,
            to: draft.description,
            changed: baseline.description !== draft.description,
          },
          {
            field: "Target market",
            from: baseline.targetMarket,
            to: draft.targetMarket,
            changed: baseline.targetMarket !== draft.targetMarket,
          },
          {
            field: "Features",
            from: (baseline.keyFeatures ?? []).join(", ") || "—",
            to: draft.keyFeatures.join(", ") || "—",
            changed:
              (baseline.keyFeatures ?? []).join("\n") !==
              draft.keyFeatures.join("\n"),
          },
        ];

  return (
    <AppShell
      status={
        isRunning
          ? "Retesting audience"
          : hasVariant
            ? "Comparison ready"
            : "Review Version 2"
      }
      tone={isRunning ? "live" : "default"}
    >
      <main className="page-shell compare-shell">
        <section className="compare-hero">
          <p className="section-label">Versus</p>
          <h1>Test the change</h1>
          <p className="hero-copy">
            See whether the change improved the response from the same
            simulated audience.
          </p>
          <p className="compare-audience-note">
            Same {session.customerIds.length} customer IDs as Version 1.
            Simulated perspectives · Not human market research.
          </p>
        </section>

        {!hasVariant && (
          <section className="compare-setup">
            <section className="compare-recommendation-card">
              <p className="section-label">Arnabela&apos;s recommendation</p>
              <h2>{draft.recommendationTitle || draft.label}</h2>
              <p>{draft.recommendationReason || draft.nextExperiment}</p>
              {draft.canApply !== false ? (
                <p className="compare-prepared-note">
                  Arnabela prepared a new version based on the strongest
                  barrier in this test. Review the change, then test it
                  against the same {session.customerIds.length} perspectives.
                </p>
              ) : (
                <p className="compare-prepared-note">
                  {draft.applyBlockReason ||
                    "Arnabela cannot safely create an automated variant from this recommendation."}
                </p>
              )}
            </section>

            <div className="compare-setup-grid">
              <article className="versus-version">
                <p className="section-label">Version 1</p>
                <h3>Original</h3>
                <p className="versus-price">{formatPrice(baseline.price)}</p>
                <p className="compare-locked-note">Locked baseline</p>
                <dl className="compare-facts">
                  <div>
                    <dt>Product</dt>
                    <dd>{baseline.productName}</dd>
                  </div>
                  <div>
                    <dt>Target market</dt>
                    <dd>{baseline.targetMarket}</dd>
                  </div>
                </dl>
              </article>

              <article className="versus-version">
                <p className="section-label">Version 2</p>
                <h3>{draft.label}</h3>
                <p className="versus-price">{formatPrice(draft.price)}</p>
                <p className="compare-locked-note">
                  {draft.canApply !== false
                    ? "Prepared from recommendation"
                    : "Manual edit required"}
                </p>
                <dl className="compare-facts">
                  <div>
                    <dt>Product</dt>
                    <dd>{draft.productName}</dd>
                  </div>
                  <div>
                    <dt>Parent test</dt>
                    <dd>{draft.parentTestId || baseline.testId}</dd>
                  </div>
                </dl>
              </article>
            </div>

            <section className="compare-changes compare-preview-changes">
              <p className="section-label">What changed</p>
              <ul>
                {summaryRows.map((row) => (
                  <li key={row.field} className={row.changed ? "changed" : ""}>
                    <strong>{row.field}</strong>
                    {row.changed ? (
                      <span className="compare-change-detail">
                        <em>Original</em>
                        <span>
                          {row.from.length > 220
                            ? `${row.from.slice(0, 217).trimEnd()}…`
                            : row.from}
                        </span>
                        <em>New</em>
                        <span>
                          {row.to.length > 220
                            ? `${row.to.slice(0, 217).trimEnd()}…`
                            : row.to}
                        </span>
                      </span>
                    ) : (
                      <span>No change</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {showManualEdit && (
              <article className="versus-version versus-version-edit">
                <p className="section-label">Edit Version 2</p>
                <div className="form-grid compare-form-grid">
                  <div className="field">
                    <label htmlFor="variantPrice">Price</label>
                    <div className="input-prefix">
                      <span>$</span>
                      <input
                        id="variantPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.price}
                        onChange={(event) =>
                          updateDraft({
                            ...draft,
                            price: Number(event.target.value),
                            canApply: true,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="variantName">Product name</label>
                    <input
                      id="variantName"
                      value={draft.productName}
                      onChange={(event) =>
                        updateDraft({
                          ...draft,
                          productName: event.target.value,
                          canApply: true,
                        })
                      }
                    />
                  </div>

                  <div className="field field-full">
                    <label htmlFor="variantDescription">
                      What are you testing?
                    </label>
                    <textarea
                      id="variantDescription"
                      rows={5}
                      value={draft.description}
                      onChange={(event) =>
                        updateDraft({
                          ...draft,
                          description: event.target.value,
                          canApply: true,
                        })
                      }
                    />
                  </div>

                  <div className="field field-full">
                    <label htmlFor="variantMarket">Target market</label>
                    <input
                      id="variantMarket"
                      value={draft.targetMarket}
                      onChange={(event) =>
                        updateDraft({
                          ...draft,
                          targetMarket: event.target.value,
                          canApply: true,
                        })
                      }
                    />
                  </div>

                  <div className="field field-full">
                    <label htmlFor="variantFeatures">
                      Key features <span>(one per line)</span>
                    </label>
                    <textarea
                      id="variantFeatures"
                      rows={4}
                      value={draft.keyFeatures.join("\n")}
                      onChange={(event) =>
                        updateDraft({
                          ...draft,
                          keyFeatures: event.target.value
                            .split("\n")
                            .map((item) => item.trim())
                            .filter(Boolean),
                          canApply: true,
                        })
                      }
                    />
                  </div>
                </div>
              </article>
            )}

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <div className="form-footer compare-actions">
              {(draft.canApply !== false || showManualEdit) && (
                <button
                  type="button"
                  className="submit-button"
                  disabled={isRunning}
                  onClick={() => void runComparison()}
                >
                  <span>
                    {isRunning ? "Testing Version 2…" : "Test Version 2"}
                  </span>
                  <span className="arrow">{isRunning ? "…" : "→"}</span>
                </button>
              )}
              <button
                type="button"
                className="compare-secondary"
                onClick={() => setShowManualEdit((value) => !value)}
              >
                {showManualEdit ? "Hide manual edit" : "Edit Version 2"}
              </button>
              {progress && <p className="cta-support">{progress}</p>}
            </div>
          </section>
        )}

        {hasVariant && comparison && session.variant && (
          <>
            <section className="versus-pair">
              <SplitBlock
                title="Version 1"
                label="Original"
                price={baseline.price}
                buy={comparison.original.buyPercentage}
                consider={comparison.original.considerPercentage}
                reject={comparison.original.rejectPercentage}
              />
              <div className="versus-divider" aria-hidden="true">
                VS
              </div>
              <SplitBlock
                title="Version 2"
                label={draft.label}
                price={session.variant.price}
                buy={comparison.variant.buyPercentage}
                consider={comparison.variant.considerPercentage}
                reject={comparison.variant.rejectPercentage}
              />
            </section>

            {changes.length > 0 && (
              <section className="compare-changes">
                <p className="section-label">What changed?</p>
                <ul>
                  {changes.map((change) => (
                    <li key={change.field}>
                      <strong>{change.field}</strong>
                      <span>
                        {change.from} → {change.to}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="compare-outcome">
              <p className="section-label">Did the recommendation help?</p>
              <h2>{comparison.outcome.headline}</h2>
              <p>{comparison.outcome.explanation}</p>
              <p className="compare-audience-note">
                Compared {comparison.comparableCustomers} perspectives
                completed in both versions
                {comparison.comparableCustomers !==
                comparison.requestedCustomers
                  ? ` (${comparison.variantCompleted} of ${comparison.requestedCustomers} completed in Version 2)`
                  : ""}
                .
              </p>
            </section>

            <section className="compare-delta">
              <p className="section-label">What happened?</p>
              <div className="compare-delta-grid">
                <div>
                  <span>Purchase intent</span>
                  <strong>
                    {comparison.purchaseIntentDelta.from} →{" "}
                    {comparison.purchaseIntentDelta.to}
                  </strong>
                  <em>{formatPoints(comparison.purchaseIntentDelta.points)}</em>
                </div>
                <div className="stat-buy">
                  <span>Buy</span>
                  <strong>
                    {comparison.buyDelta.from}% → {comparison.buyDelta.to}%
                  </strong>
                  <em>{formatPoints(comparison.buyDelta.points)}</em>
                </div>
                <div className="stat-consider">
                  <span>Consider</span>
                  <strong>
                    {comparison.considerDelta.from}% →{" "}
                    {comparison.considerDelta.to}%
                  </strong>
                  <em>{formatPoints(comparison.considerDelta.points)}</em>
                </div>
                <div className="stat-reject">
                  <span>Reject</span>
                  <strong>
                    {comparison.rejectDelta.from}% →{" "}
                    {comparison.rejectDelta.to}%
                  </strong>
                  <em>{formatPoints(comparison.rejectDelta.points)}</em>
                </div>
              </div>
            </section>

            <section className="compare-movement">
              <p className="section-label">Customer movement</p>
              <div className="compare-movement-metrics">
                <div>
                  <strong>{comparison.comparableCustomers}</strong>
                  <span>same customers compared</span>
                </div>
                <div>
                  <strong>{comparison.changedDecisions}</strong>
                  <span>changed their decision</span>
                </div>
                <div>
                  <strong>{comparison.sameDecisions}</strong>
                  <span>stayed the same</span>
                </div>
              </div>

              {comparison.transitions.length > 0 && (
                <ul className="compare-transitions">
                  {comparison.transitions.map((item) => (
                    <li key={`${item.from}-${item.to}`}>
                      <span>
                        {item.from} → {item.to}
                      </span>
                      <strong>{item.count}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {comparison.segmentMovements.length > 0 && (
              <section className="compare-segments">
                <p className="section-label">Who responded differently?</p>
                <div className="compare-segment-list">
                  {comparison.segmentMovements.map((segment) => (
                    <div key={segment.name} className="compare-segment-row">
                      <div>
                        <strong>{segment.name}</strong>
                        <span>{segment.customers} perspectives</span>
                      </div>
                      <div>
                        {segment.fromIntent} → {segment.toIntent}
                      </div>
                      <em>{formatPoints(segment.deltaPoints)}</em>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {comparison.barrierDeltas.length > 0 && (
              <section className="compare-barriers">
                <p className="section-label">Barrier movement</p>
                <div className="compare-segment-list">
                  {comparison.barrierDeltas.map((barrier) => (
                    <div key={barrier.label} className="compare-segment-row">
                      <div>
                        <strong>{barrier.label}</strong>
                      </div>
                      <div>
                        {barrier.fromPercentage}% → {barrier.toPercentage}%
                      </div>
                      <em>{formatPoints(barrier.deltaPoints)}</em>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="form-footer compare-actions">
              <button
                type="button"
                className="submit-button"
                onClick={() => {
                  storeComparisonSession({
                    ...session,
                    variant: null,
                    variantJobId: null,
                  });
                }}
              >
                <span>Review Version 2 again</span>
                <span className="arrow">→</span>
              </button>
              <button
                type="button"
                className="compare-secondary"
                onClick={() => clearComparisonSession()}
              >
                Clear comparison
              </button>
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
