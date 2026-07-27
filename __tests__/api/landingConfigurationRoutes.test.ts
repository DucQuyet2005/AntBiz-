import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { LandingConfigurationModuleError } from '@/backend/modules/landing-configuration/errors';

const mocks = vi.hoisted(() => ({
  requireUserWithRole: vi.fn(),
  createModule: vi.fn(),
  revalidatePath: vi.fn(),
  createNotifications: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({
  requireUserWithRole: mocks.requireUserWithRole,
}));
vi.mock('@/backend/modules/landing-configuration/landing-configuration-factory', () => ({
  createLandingConfigurationModule: mocks.createModule,
}));
vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock('@/lib/services/notificationService', () => ({
  createNotifications: mocks.createNotifications,
}));
vi.mock('@/utils/supabase/server', () => ({
  createClient: mocks.createClient,
}));

import {
  DELETE as clearConfiguration,
  GET as listConfiguration,
  PUT as setConfiguration,
} from '@/app/api/admin/landing-config/route';
import { POST as publishConfiguration } from '@/app/api/admin/landing-config/publish/route';
import {
  DELETE as deleteHistory,
  PATCH as updateHistory,
} from '@/app/api/admin/landing-config/history/route';
import { POST as rollbackConfiguration } from '@/app/api/admin/landing-config/rollback/[historyId]/route';
import { GET as readPublicConfiguration } from '@/app/api/landing-config/public/route';

const HISTORY_ID = '22222222-2222-4222-8222-222222222222';
const administratorsQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn(),
};
const supabase = {
  from: vi.fn(() => administratorsQuery),
};
const landingConfiguration = {
  list: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
  publish: vi.fn(),
  listHistory: vi.fn(),
  updateHistoryNote: vi.fn(),
  deleteHistory: vi.fn(),
  rollback: vi.fn(),
  readPublicConfiguration: vi.fn(),
};

function request(path: string, method = 'GET', body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    ...(body === undefined ? {} : {
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  });
}

describe('Landing Configuration Route Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    administratorsQuery.select.mockReturnThis();
    administratorsQuery.eq.mockResolvedValue({ data: [{ id: 'admin-1' }], error: null });
    mocks.createModule.mockReturnValue(landingConfiguration);
    mocks.createClient.mockReturnValue(supabase);
    mocks.requireUserWithRole.mockResolvedValue({
      supabase,
      user: { id: 'admin-1', email: 'admin@example.com' },
      role: 'admin',
      unauthorized: null,
    });
    landingConfiguration.list.mockResolvedValue([]);
    landingConfiguration.set.mockResolvedValue({ id: 'config-1' });
    landingConfiguration.clear.mockResolvedValue({ success: true });
    landingConfiguration.publish.mockResolvedValue({
      history: null,
      checkpointCreated: false,
      note: 'Published changes',
    });
    landingConfiguration.updateHistoryNote.mockResolvedValue({ success: true });
    landingConfiguration.deleteHistory.mockResolvedValue({ success: true });
    landingConfiguration.rollback.mockResolvedValue({ success: true });
    landingConfiguration.readPublicConfiguration.mockResolvedValue({ hero: { title: 'AntBiz' } });
    mocks.createNotifications.mockResolvedValue([]);
  });

  it('requires administrator access before listing configuration', async () => {
    const unauthorized = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mocks.requireUserWithRole.mockResolvedValue({ supabase, user: null, unauthorized });

    const response = await listConfiguration();

    expect(response.status).toBe(401);
    expect(landingConfiguration.list).not.toHaveBeenCalled();
    expect(mocks.requireUserWithRole).toHaveBeenCalledWith(['admin']);
  });

  it('preserves set and clear success contracts while rejecting malformed JSON', async () => {
    const malformed = await setConfiguration(request(
      '/api/admin/landing-config',
      'PUT',
      '{invalid'
    ));
    const valid = await setConfiguration(request(
      '/api/admin/landing-config',
      'PUT',
      { section: 'hero', key: 'title', value: 'AntBiz' }
    ));
    const cleared = await clearConfiguration();

    expect(malformed.status).toBe(400);
    expect(valid.status).toBe(200);
    expect(landingConfiguration.set).toHaveBeenCalledWith('admin-1', {
      section: 'hero', key: 'title', value: 'AntBiz',
    });
    expect(await cleared.json()).toEqual({
      success: true,
      message: 'All custom configuration cleared successfully',
    });
  });

  it('revalidates and notifies only after a successful publish', async () => {
    landingConfiguration.publish.mockResolvedValue({
      history: { id: HISTORY_ID },
      checkpointCreated: true,
      note: 'Release',
    });

    const response = await publishConfiguration(request(
      '/api/admin/landing-config/publish',
      'POST',
      { note: 'Release' }
    ));

    expect(response.status).toBe(200);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/');
    expect(mocks.createNotifications).toHaveBeenCalledWith([
      expect.objectContaining({ userId: 'admin-1', metadata: expect.objectContaining({
        history_id: HISTORY_ID,
      }) }),
    ]);
  });

  it('keeps publish successful when notification delivery fails', async () => {
    mocks.createNotifications.mockRejectedValue(new Error('notification failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await publishConfiguration(request(
      '/api/admin/landing-config/publish',
      'POST',
      {}
    ));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, history: null });
  });

  it('does not revalidate when atomic rollback fails', async () => {
    landingConfiguration.rollback.mockRejectedValue(new LandingConfigurationModuleError(
      'ROLLBACK_FAILED',
      'Không thể khôi phục cấu hình'
    ));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const failed = await rollbackConfiguration(
      request(`/api/admin/landing-config/rollback/${HISTORY_ID}`, 'POST'),
      { params: Promise.resolve({ historyId: HISTORY_ID }) }
    );
    expect(failed.status).toBe(500);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();

    landingConfiguration.rollback.mockResolvedValue({ success: true });
    const succeeded = await rollbackConfiguration(
      request(`/api/admin/landing-config/rollback/${HISTORY_ID}`, 'POST'),
      { params: Promise.resolve({ historyId: HISTORY_ID }) }
    );
    expect(succeeded.status).toBe(200);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/');
  });

  it('maps history input and not-found errors without changing success shapes', async () => {
    const updated = await updateHistory(request(
      '/api/admin/landing-config/history',
      'PATCH',
      { id: HISTORY_ID, note: 'Reviewed' }
    ));
    const deleted = await deleteHistory(request(
      `/api/admin/landing-config/history?id=${HISTORY_ID}`,
      'DELETE'
    ));

    expect(updated.status).toBe(200);
    expect(deleted.status).toBe(200);
    expect(landingConfiguration.updateHistoryNote).toHaveBeenCalledWith({
      id: HISTORY_ID,
      note: 'Reviewed',
    });
    expect(landingConfiguration.deleteHistory).toHaveBeenCalledWith(HISTORY_ID);
  });

  it('returns the shared public projection', async () => {
    const response = await readPublicConfiguration();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ hero: { title: 'AntBiz' } });
    expect(landingConfiguration.readPublicConfiguration).toHaveBeenCalledOnce();
  });
});
