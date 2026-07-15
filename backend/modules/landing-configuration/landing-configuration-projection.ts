import { LandingConfigurationModuleError } from './errors';
import { parseLandingConfigurationSnapshot } from './landing-configuration-schemas';
import type {
  JsonValue,
  LandingConfigurationEntry,
  LandingConfigurationSnapshot,
} from './landing-configuration-types';

export function projectLandingConfiguration(
  entries: Array<Pick<LandingConfigurationEntry, 'section' | 'key' | 'value'>>
): LandingConfigurationSnapshot {
  const snapshot: LandingConfigurationSnapshot = {};
  const identities = new Set<string>();
  const orderedEntries = [...entries].sort(
    (left, right) => left.section.localeCompare(right.section) || left.key.localeCompare(right.key)
  );

  for (const entry of orderedEntries) {
    const identity = JSON.stringify([entry.section, entry.key]);
    if (identities.has(identity)) {
      throw new LandingConfigurationModuleError(
        'DUPLICATE_CONFIGURATION',
        'Phát hiện cấu hình trùng section và key',
        undefined,
        { section: entry.section, key: entry.key }
      );
    }

    identities.add(identity);
    if (!Object.hasOwn(snapshot, entry.section)) {
      Object.defineProperty(snapshot, entry.section, {
        value: {},
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    Object.defineProperty(snapshot[entry.section], entry.key, {
      value: entry.value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }

  return snapshot;
}

export function normalizeLandingConfigurationSnapshot(input: unknown) {
  return projectLandingConfiguration(snapshotEntries(parseLandingConfigurationSnapshot(input)));
}

export function landingConfigurationSnapshotsEqual(
  left: LandingConfigurationSnapshot,
  right: LandingConfigurationSnapshot
) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function snapshotEntries(snapshot: LandingConfigurationSnapshot) {
  return Object.entries(snapshot).flatMap(([section, values]) =>
    Object.entries(values).map(([key, value]) => ({ section, key, value }))
  );
}

function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
}
