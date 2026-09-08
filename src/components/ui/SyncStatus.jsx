import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
export function SyncStatus() {
  const client = useQueryClient();
  const fetching = useIsFetching({
    predicate: (q) => q.queryKey[0] !== "data",
  });
  const failed = useSyncExternalStore(
    (fn) => client.getQueryCache().subscribe(fn),
    () =>
      client
        .getQueryCache()
        .getAll()
        .some((q) => q.state.status === "error" && q.state.data !== undefined),
  );
  return (
    <div className="sync-status" role="status" aria-live="polite">
      {fetching ? (
        <>
          <span className="sync-dot" />
          Updating…
        </>
      ) : failed ? (
        <button onClick={() => client.invalidateQueries()}>
          Couldn't refresh · Retry
        </button>
      ) : null}
    </div>
  );
}
