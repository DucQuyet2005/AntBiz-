import { z } from 'zod';
import { GeminiCapacityError } from './errors';

const keyIdSchema = z.uuid();
const labelSchema = z.string().trim().min(1).max(100);
const secretSchema = z.string().trim().min(1).max(4096);

const createKeySchema = z.object({
  key_value: secretSchema,
  label: labelSchema,
}).strict();

const updateKeySchema = z.object({
  label: labelSchema.optional(),
  status: z.enum(['active', 'invalid']).optional(),
}).strict().refine(
  (input) => input.label !== undefined || input.status !== undefined,
  { message: 'At least one update field is required' }
);

export type CreateGeminiCapacityKeyInput = z.infer<typeof createKeySchema>;
export type UpdateGeminiCapacityKeyInput = z.infer<typeof updateKeySchema>;

export function parseCreateGeminiCapacityKey(input: unknown) {
  return parse(createKeySchema, input, 'API Key hoặc nhãn không hợp lệ');
}

export function parseUpdateGeminiCapacityKey(input: unknown) {
  return parse(updateKeySchema, input, 'Dữ liệu cập nhật API Key không hợp lệ');
}

export function parseGeminiCapacityKeyId(input: unknown) {
  return parse(keyIdSchema, input, 'ID API Key không hợp lệ');
}

function parse<T>(schema: z.ZodType<T>, input: unknown, message: string): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new GeminiCapacityError('INVALID_INPUT', message);
}
