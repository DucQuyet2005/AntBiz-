import { PasswordRecoveryOriginError } from './password-recovery-errors';

export function resolvePasswordRecoveryOrigin(
  configuredSiteUrl: string | undefined,
  requestUrl: string
) {
  const configured = parseHttpOrigin(configuredSiteUrl);
  if (configured) return configured;
  const requestOrigin = parseHttpOrigin(requestUrl);
  if (requestOrigin) return requestOrigin;
  throw new PasswordRecoveryOriginError();
}

function parseHttpOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}
