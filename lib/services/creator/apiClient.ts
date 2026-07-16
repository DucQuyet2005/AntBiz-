/**
 * apiClient.ts
 * Simulated HTTP API client for creator flow services.
 * Replaces direct axios/fetch calls and provides simulated lag, success, and error wrappers.
 */

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
}

export async function simulateRequest<T>(
  data: T,
  delayMs: number = 800,
  shouldFail: boolean = false
): Promise<ApiResponse<T>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (shouldFail) {
        resolve({
          status: 'error',
          error: 'Kết nối mạng không ổn định. Vui lòng thử lại sau.',
        });
      } else {
        resolve({
          status: 'success',
          data,
        });
      }
    }, delayMs);
  });
}
