type PageResult<T> = { data: T[] | null; error: unknown };

// Advance by the actual response length: the server may cap pages below our request size.
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 500,
): Promise<T[]> {
  const rows: T[] = [];
  while (true) {
    const result = await fetchPage(rows.length, rows.length + pageSize - 1);
    if (result.error) throw result.error;
    if (!result.data?.length) return rows;
    rows.push(...result.data);
  }
}
