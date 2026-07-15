import { z } from 'zod';
import { LandingConfigurationModuleError } from './errors';
import type {
  JsonValue,
  LandingConfigurationSnapshot,
} from './landing-configuration-types';

const configurationNameSchema = z.string().trim().min(1).max(255);

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
);

const snapshotSectionSchema = z.record(configurationNameSchema, jsonValueSchema);
export const landingConfigurationSnapshotSchema: z.ZodType<LandingConfigurationSnapshot> =
  z.record(configurationNameSchema, snapshotSectionSchema);

const setConfigurationSchema = z.object({
  section: configurationNameSchema,
  key: configurationNameSchema,
  value: jsonValueSchema,
});

const publishSchema = z.object({
  note: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().max(500).default('Published changes')
  ),
  skipHistory: z.boolean().default(false),
});

const historyNoteSchema = z.object({
  id: z.uuid(),
  note: z.string().max(500),
});

const historyIdSchema = z.uuid();

export type SetLandingConfigurationInput = z.infer<typeof setConfigurationSchema>;
export type PublishLandingConfigurationInput = z.infer<typeof publishSchema>;
export type UpdateLandingConfigurationHistoryInput = z.infer<typeof historyNoteSchema>;

export function parseSetLandingConfiguration(input: unknown): SetLandingConfigurationInput {
  return parse(setConfigurationSchema, input, 'Dữ liệu cấu hình không hợp lệ');
}

export function parsePublishLandingConfiguration(input: unknown): PublishLandingConfigurationInput {
  return parse(publishSchema, input ?? {}, 'Dữ liệu xuất bản không hợp lệ');
}

export function parseUpdateLandingConfigurationHistory(
  input: unknown
): UpdateLandingConfigurationHistoryInput {
  return parse(historyNoteSchema, input, 'ID hoặc ghi chú lịch sử không hợp lệ');
}

export function parseLandingConfigurationHistoryId(input: unknown): string {
  return parse(historyIdSchema, input, 'ID lịch sử không hợp lệ');
}

export function parseLandingConfigurationSnapshot(input: unknown): LandingConfigurationSnapshot {
  return parse(landingConfigurationSnapshotSchema, input, 'Bản lưu cấu hình không hợp lệ');
}

function parse<T>(schema: z.ZodType<T>, input: unknown, message: string): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  throw new LandingConfigurationModuleError(
    'INVALID_INPUT',
    message,
    result.error
  );
}
