"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
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
  subscribeToSessionStore,
  type CustomerProgress,
  type CustomerSimulationState,
  type SimulationJobStatus,
  type StoredSimulationMeta,
} from "@/lib/simulationClient";

const POLL_INTERVAL_MS = 300;

function subscribeToStorage(onStoreChange: () => void) {
  return subscribeToSessionStore(onStoreChange);
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

function nodeTitle(customer: CustomerProgress, revealDecisions: boolean) {
  if (
    !revealDecisions &&
    (customer.state === "BUY" ||
      customer.state === "CONSIDER" ||
      customer.state === "REJECT")
  ) {
    return `${customer.customer_id} · ${customer.name} · Captured`;
  }

  return `${customer.customer_id} · ${customer.name} · ${stateLabel(customer.state)}`;
}

function nodeClassName(
  state: CustomerSimulationState,
  revealDecisions: boolean,
) {
  if (
    !revealDecisions &&
    (state === "BUY" || state === "CONSIDER" || state === "REJECT")
  ) {
    return "sim-node-done";
  }

  return `sim-node-${state.toLowerCase()}`;
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
  const [error, setError] = useState<{
    jobId: string;
    message: string;
  } | null>(null);
  const persistedJobIdRef = useRef<string | null>(null);

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
        setError(null);

        if (
          snapshot.status === "completed" &&
          snapshot.result &&
          persistedJobIdRef.current !== snapshot.job_id
        ) {
          persistedJobIdRef.current = snapshot.job_id;
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
            : "Unable to load test progress.";

        setError({
          jobId: currentMeta.jobId,
          message,
        });

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
      <AppShell status="No active test" theme="dark">
        <main className="sim-shell">
          <section className="sim-empty">
            <p className="sim-kicker">Audience</p>
            <h1>Start a test first.</h1>
            <p>
              Set up your idea and run it through 100 simulated
              customer perspectives before opening the audience map.
            </p>
            <Link href="/" className="sim-cta">
              New test →
            </Link>
          </section>
        </main>
      </AppShell>
    );
  }

  const activeJob =
    job && job.job_id === meta.jobId ? job : null;
  const activeError =
    error && error.jobId === meta.jobId ? error.message : "";
  const customers = activeJob?.customers ?? [];
  const total = activeJob?.total_customers ?? 100;
  const resolved =
    (activeJob?.completed_customers ?? 0) +
    (activeJob?.failed_customers ?? 0);
  const isComplete = activeJob?.status === "completed";
  const isFailed = activeJob?.status === "failed";
  const revealDecisions = isComplete;
  const progressPct = Math.min(
    100,
    Math.round((resolved / Math.max(total, 1)) * 100),
  );

  const reviewingDone = resolved > 0 || Boolean(activeJob);
  const consideringDone = resolved > 0;
  const comparingDone = resolved >= Math.floor(total * 0.6);
  const signalDone = isComplete;

  const shellStatus = isComplete
    ? "Audience ready"
    : isFailed
      ? "Test failed"
      : "Testing your idea";

  return (
    <AppShell
      status={shellStatus}
      tone={isComplete || isFailed ? "default" : "live"}
      theme="dark"
    >
      <main className="sim-shell">
        <section className="sim-header">
          <p className="sim-kicker">Audience</p>
          <h1>
            {isComplete
              ? "Audience captured."
              : isFailed
                ? "The test could not finish."
                : "Testing your idea"}
          </h1>
          <p className="sim-support">
            100 customer perspectives are considering your idea
            based on their individual needs, preferences and behaviours.
          </p>
          <p className="sim-product">{meta.productName}</p>
        </section>

        <section
          className={`sim-metrics ${revealDecisions ? "sim-metrics-complete" : ""}`}
        >
          <div>
            <strong>
              {resolved} / {total}
            </strong>
            <span>Perspectives captured</span>
          </div>
          {revealDecisions && (
            <>
              <div>
                <strong>{activeJob?.buy_count ?? 0}</strong>
                <span>Buy</span>
              </div>
              <div>
                <strong>{activeJob?.consider_count ?? 0}</strong>
                <span>Consider</span>
              </div>
              <div>
                <strong>{activeJob?.reject_count ?? 0}</strong>
                <span>Reject</span>
              </div>
            </>
          )}
        </section>

        <div
          className="sim-progress-track"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Test progress"
        >
          <div
            className="sim-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {activeError && (
          <p className="sim-error" role="alert">
            {activeError}
          </p>
        )}

        {isFailed && (
          <p className="sim-error" role="alert">
            {activeJob?.error || "The test job failed."}
          </p>
        )}

        <div className="sim-layout">
          <div>
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
                  className={`sim-node ${nodeClassName(customer.state, revealDecisions)}`}
                  title={nodeTitle(customer, revealDecisions)}
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
              {revealDecisions ? (
                <>
                  <span>
                    <i className="sim-swatch buy" /> Buy
                  </span>
                  <span>
                    <i className="sim-swatch consider" /> Consider
                  </span>
                  <span>
                    <i className="sim-swatch reject" /> Reject
                  </span>
                </>
              ) : (
                <span>
                  <i className="sim-swatch done" /> Captured
                </span>
              )}
              <span>
                <i className="sim-swatch failed" /> Failed
              </span>
            </section>
          </div>

          <aside className="sim-progress">
            <h2>Test progress</h2>
            <ul className="sim-progress-list">
              <li className={reviewingDone ? "done" : "active"}>
                <span className="sim-progress-mark">
                  {reviewingDone ? "✓" : "○"}
                </span>
                Reviewing audience profiles
              </li>
              <li
                className={
                  consideringDone
                    ? "done"
                    : reviewingDone
                      ? "active"
                      : ""
                }
              >
                <span className="sim-progress-mark">
                  {consideringDone ? "✓" : "○"}
                </span>
                Considering your idea
              </li>
              <li
                className={
                  comparingDone
                    ? "done"
                    : consideringDone
                      ? "active"
                      : ""
                }
              >
                <span className="sim-progress-mark">
                  {comparingDone ? "✓" : "○"}
                </span>
                Comparing alternatives
              </li>
              <li
                className={
                  signalDone
                    ? "done"
                    : comparingDone
                      ? "active"
                      : ""
                }
              >
                <span className="sim-progress-mark">
                  {signalDone ? "✓" : "○"}
                </span>
                Preparing the signal
              </li>
            </ul>

            <p className="sim-editorial">
              Real perspectives.
              <br />
              Not assumptions.
            </p>
          </aside>
        </div>

        <footer className="sim-footer">
          <p className="sim-disclaimer">
            Simulated perspectives · Not human market research
          </p>

          {isComplete ? (
            <button
              type="button"
              className="sim-cta"
              onClick={() => router.push("/results")}
            >
              View results →
            </button>
          ) : isFailed ||
            (Boolean(activeError) &&
              (activeJob === null ||
                activeError.toLowerCase().includes("not found"))) ? (
            <Link href="/" className="sim-cta">
              Start a new test →
            </Link>
          ) : (
            <p>Perspectives resolve as they are captured.</p>
          )}
        </footer>
      </main>
    </AppShell>
  );
}
