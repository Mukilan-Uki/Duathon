import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/httpClient', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const { default: httpClient } = await import('../api/httpClient');
const { authService } = await import('./authService');

describe('authService refresh', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shares one in-flight refresh request between simultaneous callers', async () => {
    let resolveRequest;
    httpClient.post.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const first = authService.refresh();
    const second = authService.refresh();
    expect(httpClient.post).toHaveBeenCalledTimes(1);

    resolveRequest({ data: { data: { accessToken: 'access-token' } } });
    await expect(Promise.all([first, second])).resolves.toEqual([
      { data: { accessToken: 'access-token' } },
      { data: { accessToken: 'access-token' } },
    ]);
  });
});
