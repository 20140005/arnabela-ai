"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  getSimulationJob,
  readSimulationJobMeta,
  storeCompletedSimulation,
  type CustomerProgress,
  type CustomerSimulationState,
  type SimulationJobStatus,
  type StoredSimulationMeta,
} from "@/lib/simulationClient";

const POLL_INTERVAL_MS = 300;

function subscribeToStorage() {
  return () => {};
}

function getStoredJobMeta() {
  const meta = readSimulationJobMeta();
  return meta ? JSON.stringify(meta) : null;
}

function stateLabel(state: CustomerSimulationState) {
  if (state === "WAITING") {
    return "Waiting";
  }

  if (state === "EVALUATING") {
    return "Evaluating";
  }

  if (state === "BUY") {
    return "Buy";
  }

  if (state === "CONSIDER") {
    return "Consider";
  }

  if (state === "REJECT") {
    return "Reject";
  }

  return "Failed";
}

function nodeTitle(customer: CustomerProgress) {
  return `${customer.customer_id} · ${customer.name} · ${stateLabel(customer.state)}`;
}

export default function SimulationPage() {
  const router = useRouter();
  const storedMeta = useSyncExternalStore(
    subscribeToStorage,
    getStoredJobMeta,
    () => null,
  );

  let meta: StoredSimulationMeta | null = null;

  if (storedMeta) {
    try {
      meta = JSON.parse(storedMeta) as StoredSimulationMeta;
    } catch {
      meta = null;
    }
  }

  const [job, setJob] = useState<SimulationJobStatus | null>(
    null,
  );
  const [error, setError] = useState("");
  const persistedRef = useRef(false);

  useEffect(() => {
    if (!storedMeta) {
      return;
    }

    let currentMeta: StoredSimulationMeta;

    try {
      currentMeta = JSON.parse(
        storedMeta,
      ) as StoredSimulationMeta;
    } catch {
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      try {
        const snapshot = await getSimulationJob(
          currentMeta.jobId,
        );

        if (cancelled) {
          return;
        }

        setJob(snapshot);
        setError("");

        if (
          snapshot.status === "completed" &&
          snapshot.result &&
          !persistedRef.current
        ) {
          persistedRef.current = true;
          storeCompletedSimulation(
            currentMeta,
            snapshot.result,
          );
        }

        if (
          snapshot.status === "completed" ||
          snapshot.status === "failed"
        ) {
          return;
        }

        timer = window.setTimeout(poll, POLL_INTERVAL_MS);
      } catch (pollError) {
        if (cancelled) {
          return;
        }

        const message =
          pollError instanceof Error
            ? pollError.message
            : "Unable to load simulation progress.";

        setError(message);

        if (message.toLowerCase().includes("not found")) {
          return;
        }

        timer = window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    void poll();

    return () => {
      cancelled = true;

      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [storedMeta]);

  if (!meta) {
    return (
      <main className="sim-shell">
        <nav className="sim-topbar">
          <Link href="/" className="brand">
            <div className="brand-mark">C</div>
            <span>arnabela</span>
          </Link>
        </nav>

        <section className="sim-empty">
          <p className="sim-kicker">ARNABELA</p>
          <h1>Start a simulation first.</h1>
          <p>
            Run a product, offer or concept through 100 simulated
            customers before opening the audience map.
          </p>
          <Link href="/" className="sim-cta">
            START A TEST →
          </Link>
        </section>
      </main>
    );
  }

  const customers = job?.customers ?? [];
  const total = job?.total_customers ?? 100;
  const resolved =
    (job?.completed_customers ?? 0) +
    (job?.failed_customers ?? 0);
  const isComplete = job?.status === "completed";
  const isFailed = job?.status === "failed";

  return (
    <main className="sim-shell">
      <nav className="sim-topbar">
        <Link href="/" className="brand">
          <div className="brand-mark">C</div>
          <span>arnabela</span>
        </Link>

        <div className="sim-live">
          <span
            className={`status-dot ${
              isComplete ? "" : "sim-live-dot"
            }`}
          />
          {isComplete
            ? "Simulation complete"
            : "Live audience"}
        </div>
      </nav>

      <section className="sim-header">
        <p className="sim-kicker">ARNABELA</p>
        <h1>
          {isComplete
            ? "Audience simulated."
            : "Simulating audience"}
        </h1>
        <p className="sim-product">{meta.productName}</p>
      </section>

      <section className="sim-metrics">
        <div>
          <strong>
            {resolved} / {total}
          </strong>
          <span>Customers</span>
        </div>
        <div>
          <strong>{job?.buy_count ?? 0}</strong>
          <span>Buy</span>
        </div>
        <div>
          <strong>{job?.consider_count ?? 0}</strong>
          <span>Consider</span>
        </div>
        <div>
          <strong>{job?.reject_count ?? 0}</strong>
          <span>Reject</span>
        </div>
      </section>

      {error && (
        <p className="sim-error" role="alert">
          {error}
        </p>
      )}

      {isFailed && (
        <p className="sim-error" role="alert">
          {job?.error || "The simulation job failed."}
        </p>
      )}

      <section className="sim-map" aria-label="Audience map">
        {(customers.length > 0
          ? customers
          : Array.from({ length: total }, (_, index) => ({
              customer_id: String(index + 1).padStart(3, "0"),
              name: "Simulated customer",
              state: "WAITING" as const,
            }))
        ).map((customer) => (
          <div
            key={customer.customer_id}
            className={`sim-node sim-node-${customer.state.toLowerCase()}`}
            title={nodeTitle(customer)}
          >
            <span>{customer.customer_id}</span>
          </div>
        ))}
      </section>

      <section className="sim-legend">
        <span>
          <i className="sim-swatch waiting" /> Waiting
        </span>
        <span>
          <i className="sim-swatch evaluating" /> Evaluating
        </span>
        <span>
          <i className="sim-swatch buy" /> Buy
        </span>
        <span>
          <i className="sim-swatch consider" /> Consider
        </span>
        <span>
          <i className="sim-swatch reject" /> Reject
        </span>
        <span>
          <i className="sim-swatch failed" /> Failed
        </span>
      </section>

      <footer className="sim-footer">
        {isComplete ? (
          <button
            type="button"
            className="sim-cta"
            onClick={() => router.push("/results")}
          >
            VIEW RESULTS →
          </button>
        ) : (
          <p>Individual customers resolve as they are evaluated.</p>
        )}
      </footer>
    </main>
  );
}
