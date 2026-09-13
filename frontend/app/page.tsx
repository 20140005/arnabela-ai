"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createMockSimulation } from "../lib/mockSimulation";

const testTypes = [
  "Product",
  "Advertisement",
  "Website",
  "Offer / Pricing",
  "Business Concept",
];

export default function Home() {
  const router = useRouter();
  const [testType, setTestType] = useState("Product");
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [features, setFeatures] = useState("");
  const [targetMarket, setTargetMarket] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  setError("");
  setIsSubmitting(true);

  const keyFeatures = features
    .split("\n")
    .map((feature) => feature.trim())
    .filter(Boolean);

  const simulation = createMockSimulation({
    testId: crypto.randomUUID(),
    productName: productName.trim(),
    testType,
    description: description.trim(),
    price: Number(price),
    targetMarket: targetMarket.trim(),
    keyFeatures,
  });

  sessionStorage.setItem(
    "customerLabSimulation",
    JSON.stringify(simulation)
  );

  setTimeout(() => {
    router.push("/results");
  }, 500);
}

  return (
    <main className="page-shell">
      <nav className="topbar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <span>Customer Lab</span>
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

        <div className="test-type-grid">
          {testTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={`test-type ${
                testType === type ? "selected" : ""
              }`}
              onClick={() => setTestType(type)}
            >
              <span>{type}</span>
              {testType === type && <span className="check">✓</span>}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="test-form">
          <div className="form-grid">
            <div className="field field-full">
              <label htmlFor="productName">
                {testType === "Product"
                  ? "Product name"
                  : `${testType} name`}
              </label>

              <input
                id="productName"
                type="text"
                placeholder="e.g. AI Field Service Assistant"
                value={productName}
                onChange={(event) =>
                  setProductName(event.target.value)
                }
                required
              />
            </div>

            <div className="field field-full">
              <label htmlFor="description">What are you testing?</label>

              <textarea
                id="description"
                placeholder="Describe the product, offer or concept in plain language..."
                rows={5}
                value={description}
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
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="targetMarket">Target market</label>

              <input
                id="targetMarket"
                type="text"
                placeholder="e.g. Australian tradespeople"
                value={targetMarket}
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
                value={features}
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
        <span>Customer Lab</span>
        <span>Simulated AI customers · Not human market research</span>
      </footer>
    </main>
  );
}