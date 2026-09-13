"use client";

import { FormEvent, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import ArnabelaRibbon from "@/components/brand/ArnabelaRibbon";
import AppShell from "@/components/layout/AppShell";
import {
  NEXT_TEST_DRAFT_KEY,
  clearCompletedSimulation,
  clearNextTestDraft,
  startSimulationJob,
  storeSimulationJobMeta,
  subscribeToSessionStore,
  type NextTestDraft,
} from "@/lib/simulationClient";

const testTypes = [
  "Product",
  "Advertisement",
  "Website",
  "Offer / Pricing",
  "Business Concept",
];

const MAX_FEATURES = 5;

function subscribeToNextTestDraft(onStoreChange: () => void) {
  return subscribeToSessionStore(onStoreChange);
}

function getNextTestDraftSnapshot() {
  return sessionStorage.getItem(NEXT_TEST_DRAFT_KEY);
}

function parseNextTestDraft(raw: string | null): NextTestDraft | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as NextTestDraft;
  } catch {
    return null;
  }
}

function parseFeatureList(value: string) {
  return value
    .split("\n")
    .map((feature) => feature.trim())
    .filter(Boolean)
    .slice(0, MAX_FEATURES);
}

export default function Home() {
  const router = useRouter();
  const rawDraft = useSyncExternalStore(
    subscribeToNextTestDraft,
    getNextTestDraftSnapshot,
    () => null,
  );
  const draft = parseNextTestDraft(rawDraft);

  const [testType, setTestType] = useState<string | null>(null);
  const [productName, setProductName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [features, setFeatures] = useState<string | null>(null);
  const [featureDraft, setFeatureDraft] = useState("");
  const [targetMarket, setTargetMarket] = useState<string | null>(null);

  const resolvedTestType = testType ?? draft?.testType ?? "Product";
  const resolvedProductName = productName ?? draft?.productName ?? "";
  const resolvedDescription = description ?? draft?.description ?? "";
  const resolvedPrice =
    price ??
    (draft && draft.price > 0 ? String(draft.price) : "");
  const resolvedFeatures =
    features ?? (draft?.keyFeatures ?? []).join("\n");
  const resolvedTargetMarket =
    targetMarket ?? draft?.targetMarket ?? "";
  const featureList = parseFeatureList(resolvedFeatures);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submitLock = useRef(false);
  const [appliedDraft, setAppliedDraft] = useState(rawDraft);

  if (rawDraft !== appliedDraft) {
    setAppliedDraft(rawDraft);
    setTestType(null);
    setProductName(null);
    setDescription(null);
    setPrice(null);
    setFeatures(null);
    setFeatureDraft("");
    setTargetMarket(null);
  }

  let draftNotice = "";

  if (draft) {
    draftNotice =
      draft.nextExperimentKind === "none"
        ? "The previous test did not produce a recommended variant. The last test has been loaded so you can adjust it."
        : `Prefilled from what to test next: ${draft.insightHeadline}`;
  }

  function updateFeatures(next: string[]) {
    setFeatures(next.slice(0, MAX_FEATURES).join("\n"));
  }

  function addFeature() {
    const next = featureDraft.trim().replace(/\s+/g, " ");
    if (!next || featureList.length >= MAX_FEATURES) {
      return;
    }
    if (featureList.some((item) => item.toLowerCase() === next.toLowerCase())) {
      setFeatureDraft("");
      return;
    }
    // Keep chips scannable; long draft phrases still store useful content.
    const clipped = next.length > 48 ? `${next.slice(0, 47).trimEnd()}…` : next;
    updateFeatures([...featureList, clipped]);
    setFeatureDraft("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || submitLock.current) {
      return;
    }

    submitLock.current = true;
    setError("");
    setIsSubmitting(true);

    const keyFeatures = featureList;

    try {
      const job = await startSimulationJob({
        product_name: resolvedProductName.trim(),
        description: resolvedDescription.trim(),
        price: Number(resolvedPrice),
        key_features: keyFeatures,
        target_market: resolvedTargetMarket.trim(),
      });

      clearCompletedSimulation();

      storeSimulationJobMeta({
        jobId: job.job_id,
        productName: resolvedProductName.trim(),
        testType: resolvedTestType,
        description: resolvedDescription.trim(),
        price: Number(resolvedPrice),
        targetMarket: resolvedTargetMarket.trim(),
        keyFeatures,
      });

      clearNextTestDraft();

      router.push("/simulation");
    } catch (submitError) {
      console.error("Simulation failed:", submitError);

      submitLock.current = false;
      setIsSubmitting(false);

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while starting the test.",
      );
    }
  }

  return (
    <AppShell status="Ready to test">
      <main className="page-shell new-test-page">
        <ArnabelaRibbon className="new-test-ribbon" opacity={0.28} />

        <section className="hero">
          <p className="eyebrow">New test</p>

          <div className="hero-layout">
            <div className="hero-copy-block">
              <h1>
                What are you trying
                <br />
                to learn?
              </h1>

              <p className="hero-copy">
                Put your idea in front of 100 different perspectives.
              </p>

              <div className="value-row">
                <div>
                  <strong>100</strong>
                  <span>Perspectives</span>
                </div>
                <div>
                  <strong>100</strong>
                  <span>Decisions</span>
                </div>
                <div>
                  <strong>1</strong>
                  <span>Signal</span>
                </div>
              </div>
            </div>

            <p className="hero-aside editorial-serif">
              One idea.
              <br />
              Many paths.
              <br />
              Clearer direction.
            </p>
          </div>
        </section>

        <section className="workspace">
          <p className="section-label">Test type</p>

          {draftNotice && (
            <div className="draft-notice" role="status">
              <p className="section-label">From previous results</p>
              <p>{draftNotice}</p>
            </div>
          )}

          <div className="test-type-grid" role="group" aria-label="Test type">
            {testTypes.map((type) => (
              <button
                key={type}
                type="button"
                className={`test-type ${
                  resolvedTestType === type ? "selected" : ""
                }`}
                onClick={() => setTestType(type)}
              >
                <span className="test-type-radio" aria-hidden="true" />
                <span>{type}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="test-form">
            <p className="section-label product-section-label">
              {resolvedTestType === "Product" ? "Product" : resolvedTestType}
            </p>

            <div className="form-grid">
              <div className="field field-full">
                <label htmlFor="productName">
                  {resolvedTestType === "Product"
                    ? "Product name"
                    : `${resolvedTestType} name`}
                </label>

                <input
                  id="productName"
                  type="text"
                  placeholder="e.g. Fresh Bowls"
                  value={resolvedProductName}
                  onChange={(event) => setProductName(event.target.value)}
                  required
                />
              </div>

              <div className="field field-full">
                <label htmlFor="description">What are you testing?</label>

                <textarea
                  id="description"
                  placeholder="Describe the idea in plain language — what it is, who it’s for, and why it matters."
                  rows={4}
                  value={resolvedDescription}
                  onChange={(event) => setDescription(event.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="price">Price</label>

                <div className="input-prefix">
                  <span>$</span>
                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="9"
                    value={resolvedPrice}
                    onChange={(event) => setPrice(event.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="targetMarket">Target market</label>

                <input
                  id="targetMarket"
                  type="text"
                  placeholder="e.g. Busy professionals"
                  value={resolvedTargetMarket}
                  onChange={(event) => setTargetMarket(event.target.value)}
                  required
                />
              </div>

              <div className="field field-full">
                <label htmlFor="featureDraft">
                  Key features <span>· up to {MAX_FEATURES}</span>
                </label>

                <div
                  className={`feature-input ${
                    featureList.length >= MAX_FEATURES ? "is-full" : ""
                  }`}
                >
                  {featureList.map((feature) => (
                    <span key={feature} className="feature-chip">
                      <span className="feature-chip-label">{feature}</span>
                      <button
                        type="button"
                        className="feature-chip-remove"
                        onClick={() =>
                          updateFeatures(
                            featureList.filter((item) => item !== feature),
                          )
                        }
                        aria-label={`Remove ${feature}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}

                  {featureList.length < MAX_FEATURES && (
                    <input
                      id="featureDraft"
                      type="text"
                      className="feature-draft-input"
                      placeholder={
                        featureList.length === 0
                          ? "Add a feature and press Enter"
                          : "Add another"
                      }
                      value={featureDraft}
                      onChange={(event) => setFeatureDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addFeature();
                        }
                        if (
                          event.key === "Backspace" &&
                          featureDraft === "" &&
                          featureList.length > 0
                        ) {
                          updateFeatures(featureList.slice(0, -1));
                        }
                      }}
                    />
                  )}
                </div>

                <div className="feature-actions">
                  {featureList.length < MAX_FEATURES ? (
                    <button
                      type="button"
                      className="feature-add-button"
                      onClick={addFeature}
                      disabled={!featureDraft.trim()}
                    >
                      + Add feature
                    </button>
                  ) : (
                    <span className="feature-limit">Maximum of {MAX_FEATURES} features</span>
                  )}
                  <span className="feature-count">
                    {featureList.length}/{MAX_FEATURES}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <div className="form-footer">
              <div className="privacy-note">
                <p>Your test is private. Customer responses are simulated.</p>
              </div>

              <div className="form-cta-block">
                <button
                  type="submit"
                  className="submit-button"
                  disabled={isSubmitting}
                >
                  <span>
                    {isSubmitting ? "Starting test…" : "Test the idea"}
                  </span>
                  <span className="arrow">{isSubmitting ? "…" : "→"}</span>
                </button>
                <p className="cta-support">
                  Test against 100 customer perspectives
                </p>
              </div>
            </div>
          </form>
        </section>
      </main>
    </AppShell>
  );
}
