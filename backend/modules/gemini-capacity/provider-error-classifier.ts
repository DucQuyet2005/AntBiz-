import type { GeminiProviderFailureKind } from './gemini-capacity-types';

export function classifyGeminiProviderError(error: unknown): GeminiProviderFailureKind {
  const status = readNumericField(error, 'status');
  const code = readStringField(error, 'code').toLowerCase();
  const message = readErrorMessage(error).toLowerCase();

  if (
    status === 429
    || code.includes('quota')
    || code.includes('rate_limit')
    || message.includes('quota')
    || message.includes('rate limit')
    || message.includes('resource_exhausted')
  ) {
    return 'quota';
  }

  if (
    status === 401
    || code.includes('api_key_invalid')
    || message.includes('api key not valid')
    || message.includes('api_key_invalid')
    || message.includes('key not valid')
    || message.includes('invalid key')
    || (status === 400 && message.includes('key'))
    || (status === 403 && /denied|disabled|blocked|forbidden/.test(message))
  ) {
    return 'credential';
  }

  const mentionsModel = message.includes('model') || code.includes('model');
  const modelUnavailable = /not found|not available|unsupported|does not exist/.test(message)
    || /not_found|not_available|unsupported/.test(code);
  if (mentionsModel && modelUnavailable && (status === 404 || status === 400 || status === undefined)) {
    return 'model_configuration';
  }

  return 'transient';
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return readStringField(error, 'message');
}

function readStringField(value: unknown, field: string) {
  if (!value || typeof value !== 'object' || !(field in value)) return '';
  const fieldValue = (value as Record<string, unknown>)[field];
  return typeof fieldValue === 'string' ? fieldValue : '';
}

function readNumericField(value: unknown, field: string) {
  if (!value || typeof value !== 'object' || !(field in value)) return undefined;
  const fieldValue = (value as Record<string, unknown>)[field];
  return typeof fieldValue === 'number' ? fieldValue : undefined;
}
