import { expect, it } from "vitest";
import { fetchAllPages } from "./pagination";

it("retrieves all rows even when the server returns fewer than the requested page size", async () => {
  const source = Array.from({ length: 1203 }, (_, i) => ({ id: i }));
  const offsets: number[] = [];
  const result = await fetchAllPages(async (from) => {
    offsets.push(from);
    return { data: source.slice(from, from + 250), error: null };
  });
  expect(result).toEqual(source);
  expect(offsets).toEqual([0, 250, 500, 750, 1000, 1203]);
});

it("never returns a partial result when a later page fails", async () => {
  await expect(fetchAllPages(async (from) => from === 0
    ? { data: [1, 2], error: null }
    : { data: null, error: new Error("offline") })).rejects.toThrow("offline");
});

it("uses an exact first-page count to avoid an empty final request, even with a lower server cap", async () => {
  const offsets: number[] = [];
  const source = [1, 2, 3, 4, 5];
  expect(await fetchAllPages(async (from) => {
    offsets.push(from);
    return { data: source.slice(from, from + 2), error: null, count: from === 0 ? source.length : null };
  })).toEqual(source);
  expect(offsets).toEqual([0, 2, 4]);
});

it("finishes a single-page response in one request", async () => {
  let requests = 0;
  expect(await fetchAllPages(async () => {
    requests++;
    return { data: [1], error: null, count: 1 };
  })).toEqual([1]);
  expect(requests).toBe(1);
});
