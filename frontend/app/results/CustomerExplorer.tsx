"use client";

import { useEffect, useId, useRef } from "react";

import {
  decisionFromResponse,
  type PreviewCustomer,
} from "@/lib/customerExplorer";
import type { CustomerProfile } from "@/lib/simulationClient";

type CustomerExplorerProps = {
  customer: PreviewCustomer;
  profile: CustomerProfile | null;
  onClose: () => void;
};

function yesNo(value: boolean | undefined) {
  if (value === undefined) {
    return "Unavailable";
  }

  return value ? "Yes" : "No";
}

function scoreValue(value: number | undefined) {
  if (typeof value !== "number") {
    return "—";
  }

  return `${value} / 10`;
}

function ScoreRow({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  return (
    <div className="explorer-score-row">
      <span>{label}</span>
      <strong>{scoreValue(value)}</strong>
    </div>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  if (value === undefined || value === "") {
    return null;
  }

  return (
    <div className="explorer-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ListBlock({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[] | undefined;
  empty: string;
}) {
  return (
    <section className="explorer-section">
      <p className="section-label">{title}</p>
      {items && items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="explorer-empty">{empty}</p>
      )}
    </section>
  );
}

export default function CustomerExplorer({
  customer,
  profile,
  onClose,
}: CustomerExplorerProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const decision = decisionFromResponse(customer);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="explorer-overlay">
      <button
        type="button"
        className="explorer-backdrop"
        aria-label="Close customer explorer"
        onClick={onClose}
      />
      <aside
        className="explorer-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="explorer-top">
          <p className="explorer-disclaimer">
            Simulated customer · Not a real person
          </p>

          <button
            ref={closeRef}
            type="button"
            className="explorer-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <p className="section-label">CUSTOMER {customer.customer_id}</p>

        <h2 id={titleId}>
          {profile?.name ?? customer.name}
        </h2>

        <p className="explorer-archetype">
          {profile?.archetype ?? customer.archetype}
        </p>

        <div className="explorer-decision-row">
          <div className={`decision explorer-decision ${decision.toLowerCase()}`}>
            {decision}
          </div>

          <div className="explorer-intent">
            <span>Purchase intent</span>
            <strong>{customer.purchase_intent} / 10</strong>
          </div>
        </div>

        {profile ? (
          <section className="explorer-section">
            <p className="section-label">PROFILE</p>
            <div className="explorer-facts">
              <Fact label="Age" value={profile.age} />
              <Fact
                label="Location"
                value={`${profile.location}, ${profile.state}`}
              />
              <Fact label="Occupation" value={profile.occupation} />
              <Fact label="Income band" value={profile.income_band} />
              <Fact label="Household" value={profile.household} />
              <Fact
                label="Home ownership"
                value={profile.home_ownership}
              />
              <Fact label="Education" value={profile.education} />
            </div>
          </section>
        ) : (
          <p className="explorer-fallback">
            Full profile details are unavailable. The decision
            below still comes from this simulated customer&apos;s
            evaluation.
          </p>
        )}

        <section className="explorer-section">
          <p className="section-label">SCORES</p>
          <ScoreRow
            label="Interest"
            value={customer.overall_interest}
          />
          <ScoreRow
            label="Understanding"
            value={customer.understanding}
          />
          <ScoreRow label="Trust" value={customer.trust} />
          <ScoreRow
            label="Price acceptance"
            value={customer.price_acceptance}
          />
          <ScoreRow
            label="Purchase intent"
            value={customer.purchase_intent}
          />
        </section>

        {profile && (
          <>
            <section className="explorer-section">
              <p className="section-label">BEHAVIOURAL PROFILE</p>
              <ScoreRow
                label="Price sensitivity"
                value={profile.financial_behaviour?.price_sensitivity}
              />
              <ScoreRow
                label="Willingness to finance"
                value={
                  profile.financial_behaviour?.willingness_to_finance
                }
              />
              <ScoreRow
                label="Impulse buying"
                value={profile.financial_behaviour?.impulse_buying}
              />
              <ScoreRow
                label="Risk tolerance"
                value={profile.personality?.risk_tolerance}
              />
              <ScoreRow
                label="Trust requirement"
                value={profile.personality?.trust_requirement}
              />
              <ScoreRow
                label="Research tendency"
                value={profile.personality?.research_tendency}
              />
              <ScoreRow
                label="Brand loyalty"
                value={profile.personality?.brand_loyalty}
              />
              <ScoreRow
                label="Digital literacy"
                value={profile.digital_literacy}
              />
            </section>

            <section className="explorer-section">
              <p className="section-label">SHOPPING BEHAVIOUR</p>
              <div className="explorer-facts">
                <Fact
                  label="Reads reviews"
                  value={yesNo(
                    profile.shopping_behaviour?.reads_reviews,
                  )}
                />
                <Fact
                  label="Compares competitors"
                  value={yesNo(
                    profile.shopping_behaviour?.compares_competitors,
                  )}
                />
                <Fact
                  label="Checks prices"
                  value={yesNo(
                    profile.shopping_behaviour?.checks_prices,
                  )}
                />
                <Fact
                  label="Prefers online shopping"
                  value={yesNo(
                    profile.shopping_behaviour?.prefers_online_shopping,
                  )}
                />
              </div>
            </section>

            <ListBlock
              title="MOTIVATIONS"
              items={profile.motivations}
              empty="No motivations were supplied for this profile."
            />
            <ListBlock
              title="CONCERNS"
              items={profile.concerns}
              empty="No concerns were supplied for this profile."
            />
            <ListBlock
              title="BEHAVIOURAL RULES"
              items={profile.behavioural_rules}
              empty="No behavioural rules were supplied for this profile."
            />
          </>
        )}

        <section className="explorer-section">
          <p className="section-label">DECISION EXPLANATION</p>
          <p className="explorer-reasoning">
            {customer.reasoning ||
              "No reasoning was returned for this simulated customer."}
          </p>
        </section>

        <ListBlock
          title="ATTRACTED BY"
          items={customer.positive_factors}
          empty="No positive factors were returned."
        />
        <ListBlock
          title="CONCERNED ABOUT"
          items={[
            customer.primary_objection,
            customer.secondary_objection,
            ...customer.negative_factors,
          ].filter((item, index, list) => {
            const cleaned = item.trim();
            return (
              cleaned.length > 0 &&
              list.findIndex(
                (candidate) =>
                  candidate.trim() === cleaned,
              ) === index
            );
          })}
          empty="No concerns were returned."
        />
        <ListBlock
          title="QUESTIONS"
          items={customer.questions}
          empty="This customer did not ask any questions."
        />
      </aside>
    </div>
  );
}
