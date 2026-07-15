import { describe, expect, it } from 'vitest';
import {
  HmacOAuthStateProtector,
  SocialAccountConnectionsError,
} from '@/backend/modules/social-account-connections';

const NOW = Date.UTC(2026, 6, 15, 12, 0, 0);
const secretProvider = (intent: string) => intent === 'threads' ? 'threads-secret' : 'facebook-secret';

describe('HmacOAuthStateProtector', () => {
  it.each(['facebook', 'instagram', 'threads'] as const)(
    'creates and verifies user-bound %s state',
    (intent) => {
      const protector = new HmacOAuthStateProtector(secretProvider, () => NOW, () => 'nonce-123');
      const created = protector.create(intent, 'user-001');

      expect(created.nonce).toBe('nonce-123');
      expect(created.expiresAt).toBe(Math.floor(NOW / 1000) + 600);
      expect(protector.verify(created.state, 'user-001', 'nonce-123')).toMatchObject({
        intent,
        userId: 'user-001',
        nonce: 'nonce-123',
      });
    }
  );

  it.each([
    ['tampered state', (state: string) => `${state.slice(0, -1)}x`, 'user-001', 'nonce-123'],
    ['wrong user', (state: string) => state, 'user-002', 'nonce-123'],
    ['wrong nonce', (state: string) => state, 'user-001', 'nonce-other'],
    ['malformed state', () => 'not-a-state', 'user-001', 'nonce-123'],
  ])('rejects %s', (_name, mutate, userId, nonce) => {
    const protector = new HmacOAuthStateProtector(secretProvider, () => NOW, () => 'nonce-123');
    const state = protector.create('facebook', 'user-001').state;
    expect(() => protector.verify(mutate(state), userId, nonce)).toThrowError(
      expect.objectContaining({ code: 'invalid_state', status: 400 })
    );
  });

  it('rejects expired state', () => {
    const issuer = new HmacOAuthStateProtector(secretProvider, () => NOW, () => 'nonce-123');
    const verifier = new HmacOAuthStateProtector(secretProvider, () => NOW + 601_000);
    const state = issuer.create('facebook', 'user-001').state;
    expect(() => verifier.verify(state, 'user-001', 'nonce-123')).toThrowError(
      expect.objectContaining({ code: 'invalid_state' })
    );
  });

  it('rejects state issued too far in the future', () => {
    const issuer = new HmacOAuthStateProtector(secretProvider, () => NOW + 120_000, () => 'nonce-123');
    const verifier = new HmacOAuthStateProtector(secretProvider, () => NOW);
    const state = issuer.create('threads', 'user-001').state;
    expect(() => verifier.verify(state, 'user-001', 'nonce-123')).toThrowError(
      expect.objectContaining({ code: 'invalid_state' })
    );
  });

  it('requires the provider signing secret', () => {
    const protector = new HmacOAuthStateProtector(() => undefined, () => NOW);
    expect(() => protector.create('facebook', 'user-001')).toThrow(SocialAccountConnectionsError);
    expect(() => protector.create('facebook', 'user-001')).toThrowError(
      expect.objectContaining({ code: 'configuration_error', status: 500 })
    );
  });
});
