import {
  LandingConfigurationModuleError,
  LandingConfigurationRepositoryError,
} from './errors';
import {
  landingConfigurationSnapshotsEqual,
  normalizeLandingConfigurationSnapshot,
  projectLandingConfiguration,
} from './landing-configuration-projection';
import {
  parseLandingConfigurationHistoryId,
  parsePublishLandingConfiguration,
  parseSetLandingConfiguration,
  parseUpdateLandingConfigurationHistory,
} from './landing-configuration-schemas';
import type {
  LandingConfigurationPublishResult,
  LandingConfigurationRepository,
} from './landing-configuration-types';

export class LandingConfigurationModule {
  constructor(private readonly repository: LandingConfigurationRepository) {}

  async list() {
    return this.persist('list configuration', () => this.repository.listEntries());
  }

  async readPublicConfiguration() {
    const entries = await this.list();
    return projectLandingConfiguration(entries);
  }

  async set(actorId: string, rawInput: unknown) {
    const input = parseSetLandingConfiguration(rawInput);
    return this.persist('set configuration', () =>
      this.repository.upsertEntry({ ...input, updatedBy: actorId })
    );
  }

  async clear() {
    await this.persist('clear configuration', () => this.repository.clearEntries());
    return { success: true as const };
  }

  async publish(actorId: string, rawInput: unknown): Promise<LandingConfigurationPublishResult> {
    const input = parsePublishLandingConfiguration(rawInput);
    const [entries, latestHistory] = await this.persist('prepare publication', () =>
      Promise.all([
        this.repository.listEntries(),
        this.repository.findLatestHistory(),
      ])
    );
    const snapshot = projectLandingConfiguration(entries);
    const latestSnapshot = latestHistory
      ? normalizeLandingConfigurationSnapshot(latestHistory.config_snapshot)
      : null;
    const unchanged = latestSnapshot
      ? landingConfigurationSnapshotsEqual(snapshot, latestSnapshot)
      : false;

    if (input.skipHistory || unchanged) {
      return {
        history: unchanged ? latestHistory : null,
        checkpointCreated: false,
        note: input.note,
      };
    }

    const history = await this.persist('create history checkpoint', () =>
      this.repository.createHistory({
        snapshot,
        note: input.note,
        createdBy: actorId,
      })
    );

    return { history, checkpointCreated: true, note: input.note };
  }

  async listHistory() {
    return this.persist('list history', () => this.repository.listHistory(10));
  }

  async updateHistoryNote(rawInput: unknown) {
    const input = parseUpdateLandingConfigurationHistory(rawInput);
    const updated = await this.persist('update history note', () =>
      this.repository.updateHistoryNote(input.id, input.note)
    );
    if (!updated) throw this.notFound(input.id);
    return { success: true as const };
  }

  async deleteHistory(rawId: unknown) {
    const id = parseLandingConfigurationHistoryId(rawId);
    const deleted = await this.persist('delete history', () => this.repository.deleteHistory(id));
    if (!deleted) throw this.notFound(id);
    return { success: true as const };
  }

  async rollback(rawId: unknown) {
    const id = parseLandingConfigurationHistoryId(rawId);
    const history = await this.persist('load rollback checkpoint', () =>
      this.repository.findHistoryById(id)
    );
    if (!history) throw this.notFound(id);

    const snapshot = normalizeLandingConfigurationSnapshot(history.config_snapshot);
    try {
      await this.repository.replaceEntries(snapshot);
    } catch (error) {
      if (isPermissionDenied(error)) {
        throw new LandingConfigurationModuleError(
          'FORBIDDEN',
          'Bạn không có quyền khôi phục cấu hình',
          error,
          { historyId: id }
        );
      }
      throw new LandingConfigurationModuleError(
        'ROLLBACK_FAILED',
        'Không thể khôi phục cấu hình',
        error,
        { historyId: id }
      );
    }

    return { success: true as const };
  }

  private async persist<T>(operation: string, task: () => Promise<T>): Promise<T> {
    try {
      return await task();
    } catch (error) {
      if (error instanceof LandingConfigurationModuleError) throw error;
      throw new LandingConfigurationModuleError(
        'PERSISTENCE_FAILED',
        'Không thể lưu cấu hình Landing Page',
        error,
        { operation }
      );
    }
  }

  private notFound(historyId: string) {
    return new LandingConfigurationModuleError(
      'CONFIGURATION_NOT_FOUND',
      'Không tìm thấy bản lưu cấu hình',
      undefined,
      { historyId }
    );
  }
}

function isPermissionDenied(error: unknown) {
  const cause = error instanceof LandingConfigurationRepositoryError
    ? error.cause
    : error;
  return Boolean(
    cause
    && typeof cause === 'object'
    && 'code' in cause
    && cause.code === '42501'
  );
}
