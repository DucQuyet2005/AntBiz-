import type { CaptionGenerationRepository, PlatformPresetRecord } from './caption-generation-types';

export class CaptionPresetResolutionError extends Error {
  constructor(
    readonly code: 'PRESET_NOT_FOUND' | 'PRESET_PLATFORM_MISMATCH',
    readonly status: 400 | 404,
    readonly clientMessage: string
  ) {
    super(clientMessage);
    this.name = 'CaptionPresetResolutionError';
  }
}

export async function resolveCaptionPlatformRules(
  repository: CaptionGenerationRepository,
  input: {
    actorId: string;
    platform?: string;
    presetMode: 'auto' | 'selected' | 'none';
    platformPresetId?: string;
  }
): Promise<string | null> {
  if (input.presetMode === 'none') return null;

  if (input.platformPresetId) {
    const preset = await repository.findPlatformPresetById(input.platformPresetId);
    if (!preset || (preset.user_id !== null && preset.user_id !== input.actorId)) {
      throw new CaptionPresetResolutionError('PRESET_NOT_FOUND', 404, 'Không tìm thấy Preset');
    }
    const targetPlatform = input.platform ? normalizePlatform(input.platform) : undefined;
    const presetPlatform = normalizePlatform(preset.platform);
    if (targetPlatform && presetPlatform !== targetPlatform && preset.platform !== 'all') {
      throw new CaptionPresetResolutionError(
        'PRESET_PLATFORM_MISMATCH', 400, 'Preset không áp dụng cho nền tảng đã chọn'
      );
    }
    return preset.rules || '';
  }

  if (!input.platform) return '';
  const platform = normalizePlatform(input.platform);
  const presets = await repository.listPlatformPresets(input.actorId, platform);
  return selectPlatformPreset(presets, input.actorId)?.rules || '';
}

function normalizePlatform(platform: string) {
  return platform === 'threads' ? 'thread' : platform;
}

function selectPlatformPreset(presets: PlatformPresetRecord[], userId: string) {
  return presets.find((preset) => preset.user_id === userId && preset.is_default)
    || presets.find((preset) => preset.user_id === userId)
    || presets.find((preset) => !preset.user_id && preset.is_default)
    || presets.find((preset) => preset.is_default)
    || presets.find((preset) => !preset.user_id)
    || presets[0];
}
