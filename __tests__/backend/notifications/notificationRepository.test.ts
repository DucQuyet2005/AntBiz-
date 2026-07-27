import { beforeEach, describe, expect, it } from 'vitest';
import { SupabaseNotificationRepository } from '@/backend/modules/notifications/notification-repository';

describe('SupabaseNotificationRepository', () => {
  let builder: FakeBuilder;
  let repository: SupabaseNotificationRepository;

  beforeEach(() => {
    builder = new FakeBuilder();
    repository = new SupabaseNotificationRepository({
      from: (table: string) => {
        builder.calls.push(['from', table]);
        return builder;
      },
    } as never);
  });

  it('loads a persisted user role by ID', async () => {
    builder.response = { data: { role: 'admin' }, error: null };
    await expect(repository.findUserRole('u1')).resolves.toBe('admin');
    expect(builder.calls).toContainEqual(['eq', 'id', 'u1']);
  });

  it('applies owner, ordering, pagination, and schedule filters', async () => {
    builder.response = { data: [], error: null, count: 0 };
    await repository.list('u1', 2, 10, { kind: 'schedule', keywords: ['lịch'] });
    expect(builder.calls).toContainEqual(['eq', 'user_id', 'u1']);
    expect(builder.calls).toContainEqual(['order', 'created_at', { ascending: false }]);
    expect(builder.calls).toContainEqual(['range', 10, 19]);
    const orCall = builder.calls.find((call) => call[0] === 'or');
    expect(orCall?.[1]).toContain('type.eq.ab_test_complete');
  });

  it('marks one notification with both ID and owner filters', async () => {
    builder.response = { data: { id: 'n1', is_read: true }, error: null };
    await repository.markRead('u1', 'n1');
    expect(builder.calls).toContainEqual(['eq', 'id', 'n1']);
    expect(builder.calls).toContainEqual(['eq', 'user_id', 'u1']);
    expect(builder.calls.some((call) => call[0] === 'maybeSingle')).toBe(true);
  });

  it('maps a creation input to database column names', async () => {
    builder.response = { data: { id: 'n1' }, error: null };
    await repository.insert({
      userId: 'u1', type: 'info', title: 'Title', message: 'Message', metadata: { x: 1 },
    });
    expect(builder.calls).toContainEqual(['insert', {
      user_id: 'u1', type: 'info', title: 'Title', message: 'Message', metadata: { x: 1 }, email_sent: false,
    }]);
  });
});

class FakeBuilder {
  calls: unknown[][] = [];
  response: { data: unknown; error: unknown; count?: number | null } = {
    data: null, error: null,
  };

  select(...args: unknown[]) { this.calls.push(['select', ...args]); return this; }
  eq(...args: unknown[]) { this.calls.push(['eq', ...args]); return this; }
  in(...args: unknown[]) { this.calls.push(['in', ...args]); return this; }
  order(...args: unknown[]) { this.calls.push(['order', ...args]); return this; }
  or(...args: unknown[]) { this.calls.push(['or', ...args]); return this; }
  not(...args: unknown[]) { this.calls.push(['not', ...args]); return this; }
  insert(...args: unknown[]) { this.calls.push(['insert', ...args]); return this; }
  update(...args: unknown[]) { this.calls.push(['update', ...args]); return this; }
  range(...args: unknown[]) {
    this.calls.push(['range', ...args]);
    return Promise.resolve(this.response);
  }
  maybeSingle() {
    this.calls.push(['maybeSingle']);
    return Promise.resolve(this.response);
  }
  single() {
    this.calls.push(['single']);
    return Promise.resolve(this.response);
  }
  then(resolve: (value: unknown) => unknown) {
    return Promise.resolve(this.response).then(resolve);
  }
}
