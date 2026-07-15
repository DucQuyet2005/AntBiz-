import { describe, expect, it } from 'vitest';
import {
  parseRoleMutation,
  parseStatusMutation,
  parseUserList,
} from '@/backend/modules/user-access-administration/user-access-administration-schemas';

describe('User Access Administration schemas', () => {
  it('applies list defaults and normalizes search', () => {
    expect(parseUserList({ search: '  user@example.com  ', role: 'all', status: 'all' }))
      .toEqual({
        search: 'user@example.com', role: undefined, status: undefined, page: 1, limit: 10,
      });
  });

  it.each(['0', '-1', '1.5', 'abc'])('rejects invalid pagination %s', (page) => {
    expect(() => parseUserList({ page })).toThrowError(/số nguyên dương/);
  });

  it('validates list filters', () => {
    expect(parseUserList({ role: 'admin', status: 'pending' })).toMatchObject({
      role: 'admin', status: 'pending',
    });
    expect(() => parseUserList({ role: 'owner' })).toThrowError(/role/);
    expect(() => parseUserList({ status: 'deleted' })).toThrowError(/status/);
  });

  it('validates role mutations', () => {
    expect(parseRoleMutation({ role: 'marketer_full' })).toEqual({ role: 'marketer_full' });
    expect(() => parseRoleMutation({ role: 'owner' })).toThrowError(/Vai trò/);
  });

  it('trims lock reasons and rejects pending mutations', () => {
    expect(parseStatusMutation({ status: 'locked', locked_reason: '  repeated abuse  ' }))
      .toEqual({ status: 'locked', lockedReason: 'repeated abuse' });
    expect(() => parseStatusMutation({ status: 'locked', locked_reason: ' too short ' }))
      .toThrowError(/10 ký tự/);
    expect(() => parseStatusMutation({ status: 'pending' })).toThrowError(/active hoặc locked/);
  });
});
