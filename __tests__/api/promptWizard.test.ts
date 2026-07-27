import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { PromptConfigAiError } from '@/backend/modules/prompt-configs/prompt-config-ai-errors';
import { POST } from '@/app/api/prompt-configs/from-wizard/route';

const mocks = vi.hoisted(() => ({
  requireUserWithRole: vi.fn(),
  buildModule: vi.fn(),
  generateWizardPrompt: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({ requireUserWithRole: mocks.requireUserWithRole }));
vi.mock('@/app/api/prompt-configs/_ai-adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/api/prompt-configs/_ai-adapter')>();
  return { ...actual, buildPromptConfigAiModule: mocks.buildModule };
});

function request(body: string) {
  return new NextRequest('http://localhost/api/prompt-configs/from-wizard', {
    method: 'POST',
    body,
  });
}

const validInput = {
  platform: 'facebook',
  tone: 'Chuyên nghiệp',
  length: 'Vừa',
  emphasis: 'Khuyến mãi',
  variantCount: 2,
};

describe('POST /api/prompt-configs/from-wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserWithRole.mockResolvedValue({ unauthorized: null });
    mocks.buildModule.mockReturnValue({ generateWizardPrompt: mocks.generateWizardPrompt });
  });

  it('returns the existing unauthorized response', async () => {
    mocks.requireUserWithRole.mockResolvedValue({
      unauthorized: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    expect((await POST(request(JSON.stringify(validInput)))).status).toBe(401);
  });

  it('returns 500 when the Gemini key is missing before body parsing', async () => {
    mocks.buildModule.mockImplementation(() => {
      throw new PromptConfigAiError('MISSING_GEMINI_KEY', 'Thiếu GEMINI_API_KEY trong .env');
    });
    const response = await POST(request('{'));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Thiếu GEMINI_API_KEY trong .env' });
  });

  it('returns 400 for malformed JSON and invalid Wizard fields', async () => {
    expect((await POST(request('{'))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ ...validInput, variantCount: 1 })))).status).toBe(400);
  });

  it('returns the generated prompt', async () => {
    mocks.generateWizardPrompt.mockResolvedValue('Generated prompt');
    const response = await POST(request(JSON.stringify(validInput)));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ prompt: 'Generated prompt' });
    expect(mocks.generateWizardPrompt).toHaveBeenCalledWith(validInput);
  });

  it('maps typed generation failures to 500', async () => {
    mocks.generateWizardPrompt.mockRejectedValue(
      new PromptConfigAiError('WIZARD_GENERATION_FAILED', 'Gemini failed')
    );
    const response = await POST(request(JSON.stringify(validInput)));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Gemini failed' });
  });
});
