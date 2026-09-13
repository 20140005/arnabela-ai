"use client";

import { FormEvent, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

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
    setTargetMarket(null);
  }

  let draftNotice = "";

  if (draft) {
    draftNotice =
      draft.nextExperimentKind === "none"
        ? "The previous simulation did not produce a recommended variant. The last test has been loaded so you can adjust it."
        : `This form was prefilled from the previous Arnabela Insight: ${draft.insightHeadline}`;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSubmitting || submitLock.current) {
      return;
    }

    submitLock.current = true;
    setError("");
    setIsSubmitting(true);

    const keyFeatures = resolvedFeatures
      .split("\n")
      .map((feature) => feature.trim())
      .filter(Boolean);

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
          : "Something went wrong while running the simulation.",
      );
    }
  }

  return (
    <main className="page-shell">
      <nav className="topbar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <span>arnabela</span>
        </div>

        <div className="nav-status">
          <span className="status-dot" />
          AI Customer Simulation
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">
          <span>100 AI CUSTOMERS</span>
          <span className="eyebrow-line" />
          <span>IN MINUTES</span>
        </div>

        <h1>
          Test your idea
          <br />
          <span>before the market does.</span>
        </h1>

        <p className="hero-copy">
          Put your product, offer or concept in front of 100 distinct
          simulated AI customers and discover what they would actually think,
          question and buy.
        </p>

        <div className="value-row">
          <div>
            <strong>100</strong>
            <span>AI customers</span>
          </div>

          <div>
            <strong>100</strong>
            <span>different decisions</span>
          </div>

          <div>
            <strong>1</strong>
            <span>business insight</span>
          </div>
        </div>
      </section>

      <section className="workspace">
        <div className="workspace-header">
          <div>
            <p className="section-label">START A TEST</p>
            <h2>What do you want to test?</h2>
          </div>

          <div className="simulation-badge">
            <span className="status-dot" />
            Simulation ready
          </div>
        </div>

        {draftNotice && (
          <div className="draft-notice" role="status">
            <p className="section-label">
              NEXT TEST FROM ARNABELA INSIGHT
            </p>
            <p>{draftNotice}</p>
          </div>
        )}

        <div className="test-type-grid">
          {testTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={`test-type ${
                resolvedTestType === type ? "selected" : ""
              }`}
              onClick={() => setTestType(type)}
            >
              <span>{type}</span>

              {resolvedTestType === type && (
                <span className="check">✓</span>
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="test-form">
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
                placeholder="e.g. AI Field Service Assistant"
                value={resolvedProductName}
                onChange={(event) =>
                  setProductName(event.target.value)
                }
                required
              />
            </div>

            <div className="field field-full">
              <label htmlFor="description">
                What are you testing?
              </label>

              <textarea
                id="description"
                placeholder="Describe the product, offer or concept in plain language..."
                rows={5}
                value={resolvedDescription}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
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
                  placeholder="199"
                  value={resolvedPrice}
                  onChange={(event) =>
                    setPrice(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="targetMarket">
                Target market
              </label>

              <input
                id="targetMarket"
                type="text"
                placeholder="e.g. Australian tradespeople"
                value={resolvedTargetMarket}
                onChange={(event) =>
                  setTargetMarket(event.target.value)
                }
                required
              />
            </div>

            <div className="field field-full">
              <label htmlFor="features">
                Key features <span>(one per line)</span>
              </label>

              <textarea
                id="features"
                placeholder={
                  "Voice-to-job-note conversion\nAutomatic quote generation\nCustomer follow-up messages"
                }
                rows={5}
                value={resolvedFeatures}
                onChange={(event) =>
                  setFeatures(event.target.value)
                }
              />
            </div>
          </div>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <div className="form-footer">
            <div className="privacy-note">
              <span className="lock">◆</span>
              Your test is private. Customers are simulated AI profiles.
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              <span>
                {isSubmitting
                  ? "STARTING SIMULATION..."
                  : "TEST WITH 100 CUSTOMERS"}
              </span>

              <span className="arrow">
                {isSubmitting ? "…" : "→"}
              </span>
            </button>
          </div>
        </form>
      </section>

      <footer>
        <span>arnabela</span>
        <span>
          Simulated AI customers · Not human market research
        </span>
      </footer>
    </main>
  );
}