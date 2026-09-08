import { test } from "node:test";
import assert from "node:assert/strict";
import {
  queryClient,
  withQueryCache,
  clearSessionCache,
  getRevision,
} from "../src/lib/queryClient.js";
test("concurrent readers share one request and cache the result", async () => {
  queryClient.clear();
  let calls = 0;
  const source = withQueryCache({
    getRequests: async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 5));
      return [{ id: "a" }];
    },
  });
  const [a, b] = await Promise.all([
    source.getRequests(),
    source.getRequests(),
  ]);
  assert.deepEqual(a, b);
  await source.getRequests();
  assert.equal(calls, 1);
});
test("successful writes invalidate request data without refreshing catalog", async () => {
  queryClient.clear();
  let rows = ["a"];
  const source = withQueryCache({
    getRequests: async () => [...rows],
    submitRequest: async () => {
      rows.push("b");
      return "b";
    },
  });
  queryClient.setQueryData(["catalog", "user"], { teams: [] });
  assert.deepEqual(await source.getRequests(), ["a"]);
  const revision = getRevision();
  await source.submitRequest();
  assert.deepEqual(await source.getRequests(), ["a", "b"]);
  assert.equal(
    queryClient.getQueryState(["catalog", "user"]).isInvalidated,
    false,
  );
  assert.equal(getRevision(), revision + 1);
});
test("failed writes do not invalidate or claim success", async () => {
  queryClient.clear();
  const source = withQueryCache({
    getRequests: async () => ["a"],
    approveRequest: async () => {
      throw new Error("Denied");
    },
  });
  await source.getRequests();
  const revision = getRevision();
  await assert.rejects(source.approveRequest(), /Denied/);
  assert.equal(getRevision(), revision);
  assert.equal(
    queryClient.getQueryState(["data", "getRequests"]).isInvalidated,
    false,
  );
});
test("configuration writes invalidate catalog and signing out clears identity data", async () => {
  queryClient.clear();
  queryClient.setQueryData(["catalog", "user"], { teams: [] });
  const source = withQueryCache({ saveTeam: async () => ({ id: "team" }) });
  await source.saveTeam();
  assert.equal(
    queryClient.getQueryState(["catalog", "user"]).isInvalidated,
    true,
  );
  clearSessionCache();
  assert.equal(queryClient.getQueryCache().getAll().length, 0);
});
