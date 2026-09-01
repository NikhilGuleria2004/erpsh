export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export function parsePagination(
  query: { page?: number; limit?: number },
  defaults: { page?: number; limit?: number; maxLimit?: number } = {},
): Pagination {
  const page = Math.max(1, query.page ?? defaults.page ?? 1);
  const maxLimit = defaults.maxLimit ?? 100;
  const limit = Math.min(maxLimit, Math.max(1, query.limit ?? defaults.limit ?? 20));
  return { page, limit, skip: (page - 1) * limit };
}