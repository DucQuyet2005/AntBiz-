export type GlobalSearchErrorCode = 'VALIDATION' | 'FORBIDDEN';

export class GlobalSearchError extends Error {
  constructor(
    public readonly code: GlobalSearchErrorCode,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'GlobalSearchError';
  }
}

export type GlobalSearchRepositoryOperation =
  | 'search-users'
  | 'search-audit-logs'
  | 'search-articles'
  | 'search-captions'
  | 'search-prompts';

export class GlobalSearchRepositoryError extends Error {
  constructor(
    public readonly operation: GlobalSearchRepositoryOperation,
    cause: unknown
  ) {
    super('Không thể thực hiện tìm kiếm toàn cục', { cause });
    this.name = 'GlobalSearchRepositoryError';
  }
}
