import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock context and translations
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'vi',
  }),
}));

// Mock values
const mockContextValue = {
  editState: null as { variantId: string; field: string } | null,
  setEditState: vi.fn(),
  handleUpdateVariantField: vi.fn(),
  isGeneratingAB: false,
  variants: [
    {
      id: 'A',
      facebook: 'Bản nháp facebook',
      threads: 'Bản nháp threads',
      instagram: 'Bản nháp instagram',
      title: 'Tiêu đề A',
      author: 'Tác giả A',
      tags: 'tag A',
      facebookStatus: 'draft' as const,
      threadsStatus: 'scheduled' as const, // Locked for editing
      instagramStatus: 'posted' as const, // Locked for editing
    }
  ],
  setVariants: vi.fn(),
  articleId: 'test-article-uuid',
  selectedPlatform: 'facebook' as const,
  selectedPrompt: null,
};

// Set up React hooks spies
vi.spyOn(React, 'useContext').mockImplementation(() => mockContextValue);
vi.spyOn(React, 'useRef').mockImplementation((initialValue: any) => ({ current: initialValue }));
vi.spyOn(React, 'useEffect').mockImplementation(() => {});
(vi.spyOn(React, 'useState') as any).mockImplementation((initialValue: any) => [initialValue, vi.fn()]);

import { EditableText } from '@/components/views/AiCreatorView';

describe('EditableText Component Inline Edit Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContextValue.editState = null;
  });

  it('renders read-only display state by default when not editing', () => {
    const element = EditableText({
      variantId: 'A',
      field: 'facebook',
      value: 'Bản nháp facebook',
      originalValue: 'AI Facebook gốc',
      textarea: true,
    });

    expect(element).toBeDefined();
    expect(element.props.className).toContain('cursor-pointer');
    
    // Check main container children structure (it is an array since there is a sibling edit pen icon)
    const mainWrapper = element.props.children[0];
    expect(mainWrapper.props.className).toContain('flex flex-col');
    
    // Check static span value
    const textSpan = mainWrapper.props.children[0];
    expect(textSpan.props.children).toBe('Bản nháp facebook');
  });

  it('renders locked status and disables edit action when caption status is scheduled or posted', () => {
    const element = EditableText({
      variantId: 'A',
      field: 'threads',
      value: 'Bản nháp threads',
      originalValue: 'AI Threads gốc',
      textarea: true,
    });

    expect(element).toBeDefined();
    // Class name should contain cursor-default, not cursor-pointer
    expect(element.props.className).toContain('cursor-default');
    expect(element.props.className).not.toContain('cursor-pointer');

    const mainWrapper = element.props.children[0];
    // Main container has a child for Lock indicator
    const lockIndicator = mainWrapper.props.children[1];
    expect(lockIndicator).toBeDefined();
    expect(lockIndicator.props.className).toContain('bg-gray-50');
    expect(lockIndicator.props.children[1]).toContain('Đã lên lịch / Đã đăng - Khóa chỉnh sửa');
  });

  it('renders the editing textarea when isEditing is true', () => {
    // Set editState to active
    mockContextValue.editState = { variantId: 'A', field: 'facebook' };

    const element = EditableText({
      variantId: 'A',
      field: 'facebook',
      value: 'Bản nháp facebook',
      originalValue: 'AI Facebook gốc',
      textarea: true,
    });

    expect(element).toBeDefined();
    expect(element.props.className).toContain('w-full');

    const innerWrapper = element.props.children;
    
    // Textarea input field
    const textareaField = innerWrapper.props.children[0];
    expect(textareaField).toBeDefined();
    expect(textareaField.props.value).toBe('Bản nháp facebook');
    expect(textareaField.props.className).toContain('resize-none');
  });
});
