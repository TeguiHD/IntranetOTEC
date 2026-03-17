export type PaginationInput = {
  limit?: number;
  offset?: number;
};

export type PaginationResult = {
  limit: number;
  offset: number;
};

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

export function resolvePagination(input: PaginationInput = {}): PaginationResult {
  const safeLimit = Math.min(
    Math.max(input.limit ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  const safeOffset = Math.max(input.offset ?? 0, 0);

  return {
    limit: safeLimit,
    offset: safeOffset,
  };
}
