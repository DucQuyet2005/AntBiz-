import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as runWizard } from '@/app/api/prompt-configs/from-wizard/route';
import { POST as createConfig } from '@/app/api/prompt-configs/route';

let currentRole = 'marketer_full';
let mockPromptConfigsDb: any[] = [];

class MockQueryBuilder {
  private filters: Array<{ col: string; val: any; type: 'eq' | 'neq' }> = [];
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private actionData: any = null;

  constructor(private table: string) {}

  select(columns?: string) {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ col: column, val: value, type: 'eq' });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ col: column, val: value, type: 'neq' });
    return this;
  }

  order(column: string, options?: any) {
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.actionData = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.actionData = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  private execute(): any[] {
    if (this.table === 'users') {
      return [{ role: currentRole }];
    }

    if (this.table !== 'prompt_configs') {
      return [];
    }

    if (this.action === 'insert') {
      const records = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
      const inserted = records.map((r, i) => ({
        id: r.id || `pc-${mockPromptConfigsDb.length + i + 1}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_default: false,
        params: {},
        ...r,
      }));
      mockPromptConfigsDb.push(...inserted);
      this.filters = [{ col: 'id', val: inserted[0].id, type: 'eq' }];
      this.action = 'select';
    }

    const getFiltered = () => {
      return mockPromptConfigsDb.filter((r) => {
        for (const filter of this.filters) {
          if (filter.type === 'eq' && r[filter.col] !== filter.val) return false;
          if (filter.type === 'neq' && r[filter.col] === filter.val) return false;
        }
        return true;
      });
    };

    return getFiltered();
  }

  then(onfulfilled: any) {
    try {
      const data = this.execute();
      return Promise.resolve({ data, error: null }).then(onfulfilled);
    } catch (e: any) {
      return Promise.resolve({ data: null, error: e }).then(onfulfilled);
    }
  }

  async single() {
    try {
      const data = this.execute();
      if (data.length === 0) {
        return { data: null, error: new Error('Not found') };
      }
      return { data: data[0], error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
  }

  async maybeSingle() {
    try {
      const data = this.execute();
      return { data: data[0] || null, error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
  }
}

// Mock Auth & Database
const mockGetUser = vi.fn();
const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: (table: string) => new MockQueryBuilder(table),
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [],
    setAll: () => {},
  }),
}));

// Mock GoogleGenerativeAI
const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      constructor(apiKey: string) {}
      getGenerativeModel() {
        return {
          generateContent: mockGenerateContent,
        };
      }
    },
  };
});

describe('Prompt Configs Wizard API (US-2.08)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'mock-api-key';
    currentRole = 'marketer_full';
    mockPromptConfigsDb = [];
  });

  describe('POST /api/prompt-configs/from-wizard (Unit Test)', () => {
    it('returns 401 if unauthorized', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
      const req = new NextRequest('http://localhost/api/prompt-configs/from-wizard', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'facebook',
          tone: 'Chuyên nghiệp',
          length: 'Vừa',
          emphasis: 'Khuyến mãi',
          variantCount: 2,
        }),
      });
      const res = await runWizard(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid inputs', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      // Thiếu field platform
      const req = new NextRequest('http://localhost/api/prompt-configs/from-wizard', {
        method: 'POST',
        body: JSON.stringify({
          tone: 'Chuyên nghiệp',
          length: 'Vừa',
          emphasis: 'Khuyến mãi',
          variantCount: 2,
        }),
      });
      const res = await runWizard(req);
      expect(res.status).toBe(400);
    });

    it('generates prompt template correctly for different inputs (Facebook + Chuyên nghiệp)', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Bạn là một chuyên gia Content Marketer viết bài đăng Facebook chuyên nghiệp. TUYỆT ĐỐI KHÔNG có lời dẫn giải, không "Ok", không "Đây là bài viết". Trả về TRỰC TIẾP bài đăng hoàn chỉnh.',
        },
      });

      const req = new NextRequest('http://localhost/api/prompt-configs/from-wizard', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'facebook',
          tone: 'Chuyên nghiệp',
          length: 'Vừa',
          emphasis: 'Khuyến mãi',
          variantCount: 2,
        }),
      });

      const res = await runWizard(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.prompt).toContain('Facebook');
      expect(json.prompt).toContain('TUYỆT ĐỐI KHÔNG');
    });

    it('generates prompt template correctly for Threads + Hào hùng', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Bạn là một chuyên gia Content Marketer viết bài đăng Threads với tone Hào hùng. TUYỆT ĐỐI KHÔNG có lời dẫn giải, không "Ok", không "Đây là bài viết". Trả về TRỰC TIẾP bài đăng hoàn chỉnh.',
        },
      });

      const req = new NextRequest('http://localhost/api/prompt-configs/from-wizard', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'threads',
          tone: 'Hào hùng',
          length: '360 từ',
          emphasis: 'Sức mạnh thương hiệu',
          variantCount: 3,
        }),
      });

      const res = await runWizard(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.prompt).toContain('Threads');
      expect(json.prompt).toContain('Hào hùng');
    });
  });

  describe('Integration Flow: Wizard -> Create Config -> Use Config', () => {
    it('simulates the full wizard onboarding flow successfully', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      
      // Step 1: Khởi tạo và sinh prompt từ Wizard
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Prompt mẫu cho Instagram',
        },
      });

      const wizardReq = new NextRequest('http://localhost/api/prompt-configs/from-wizard', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'instagram',
          tone: 'Thân thiện',
          length: 'Ngắn',
          emphasis: 'Không có',
          variantCount: 2,
        }),
      });
      const wizardRes = await runWizard(wizardReq);
      expect(wizardRes.status).toBe(200);
      const wizardJson = await wizardRes.json();
      const generatedPrompt = wizardJson.prompt;
      expect(generatedPrompt).toBe('Prompt mẫu cho Instagram');

      // Step 2: Mô phỏng lưu cấu hình đã tạo vào DB
      const saveReq = new NextRequest('http://localhost/api/prompt-configs', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Cấu hình từ Wizard',
          platform: 'instagram',
          is_default: true,
          params: {
            tone: 'Thân thiện',
            length: 'Ngắn',
            emphasis: 'Không có',
            variant_count: 2,
          },
        }),
      });

      const saveRes = await createConfig(saveReq);
      expect(saveRes.status).toBe(201);
      expect(mockPromptConfigsDb).toHaveLength(1);
      expect(mockPromptConfigsDb[0].name).toBe('Cấu hình từ Wizard');
      expect(mockPromptConfigsDb[0].params.tone).toBe('Thân thiện');
    });
  });
});
