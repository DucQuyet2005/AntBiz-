import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  parse: vi.fn(),
  requireUserWithRole: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({
  requireUserWithRole: mocks.requireUserWithRole,
}));

vi.mock('@/backend/modules/document-parsing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/backend/modules/document-parsing')>();
  return {
    ...actual,
    createDocumentParsingModule: () => ({ parse: mocks.parse }),
  };
});

function requestWithFile(file: File) {
  const body = new FormData();
  body.append('file', file);
  return new Request('http://localhost/api/parse-doc', { method: 'POST', body });
}

describe('POST /api/parse-doc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserWithRole.mockResolvedValue({
      user: { id: 'user-001' },
      supabase: {},
      unauthorized: null,
    });
    mocks.parse.mockResolvedValue({ text: 'Extracted text' });
  });

  it('returns the authorization response before parsing the body', async () => {
    const unauthorized = new Response('Unauthorized', { status: 401 });
    mocks.requireUserWithRole.mockResolvedValue({ unauthorized });
    const { POST } = await import('@/app/api/parse-doc/route');

    await expect(POST(new Request('http://localhost/api/parse-doc', { method: 'POST' }) as never))
      .resolves.toBe(unauthorized);
    expect(mocks.parse).not.toHaveBeenCalled();
  });

  it('maps the uploaded file and preserves the response contract', async () => {
    const file = new File(['pdf'], 'report.pdf', { type: 'application/pdf' });
    const { POST, maxDuration } = await import('@/app/api/parse-doc/route');
    const response = await POST(requestWithFile(file) as never);

    expect(maxDuration).toBe(60);
    expect(response.status).toBe(200);
    expect(mocks.requireUserWithRole).toHaveBeenCalledWith([
      'admin',
      'marketer_full',
      'marketer_content',
    ]);
    expect(mocks.parse).toHaveBeenCalledWith({
      file: expect.objectContaining({ name: 'report.pdf', type: 'application/pdf' }),
    });
    await expect(response.json()).resolves.toEqual({ text: 'Extracted text' });
  });

  it('returns 400 for malformed multipart data', async () => {
    const request = new Request('http://localhost/api/parse-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: 'invalid',
    });
    const { POST } = await import('@/app/api/parse-doc/route');
    const response = await POST(request as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Request phải là multipart/form-data',
    });
  });

  it('maps typed module errors without leaking their cause', async () => {
    const { DocumentParsingError } = await import('@/backend/modules/document-parsing');
    mocks.parse.mockRejectedValue(new DocumentParsingError(
      'PARSING_FAILED',
      500,
      'Không thể xử lý file PDF lúc này',
      { cause: new Error('secret provider body'), context: { providerStatus: 500 } }
    ));
    const { POST } = await import('@/app/api/parse-doc/route');
    const response = await POST(requestWithFile(new File(['pdf'], 'report.pdf')) as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Không thể xử lý file PDF lúc này',
    });
  });

  it('returns a generic message for unexpected errors', async () => {
    mocks.parse.mockRejectedValue(new Error('secret unexpected error'));
    const { POST } = await import('@/app/api/parse-doc/route');
    const response = await POST(requestWithFile(new File(['pdf'], 'report.pdf')) as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Lỗi hệ thống khi trích xuất tài liệu',
    });
  });
});
