import { describe, it, expect, vi } from 'vitest';

// Mock the react module directly so destructured imports resolve to mocked hooks
vi.mock('react', async (importOriginal) => {
  const original = await importOriginal<typeof import('react')>();
  return {
    ...original,
    useState: (init: any) => [init, vi.fn()],
    useEffect: () => {},
  };
});

import React from 'react';
import DebouncedTextarea from '@/components/DebouncedTextarea';

describe('DebouncedTextarea component unit tests', () => {
  it('should import and exist as a function (functional component)', () => {
    expect(DebouncedTextarea).toBeTypeOf('function');
  });

  it('should return a valid textarea React element structure when called as a function', () => {
    const mockOnChange = vi.fn();
    const element = DebouncedTextarea({
      value: 'Hello World',
      onChange: mockOnChange,
      placeholder: 'Nhập caption...',
      rows: 10,
      className: 'test-textarea-class',
      id: 'test-id',
      disabled: false
    });

    expect(element).toBeDefined();
    expect(element.type).toBe('textarea');
    expect(element.props.value).toBe('Hello World');
    expect(element.props.placeholder).toBe('Nhập caption...');
    expect(element.props.rows).toBe(10);
    expect(element.props.className).toBe('test-textarea-class');
    expect(element.props.id).toBe('test-id');
    expect(element.props.disabled).toBe(false);
  });
});
