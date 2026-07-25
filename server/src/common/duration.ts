const UNIT_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

// Parses "10m", "8h", "45s", "1d" to seconds. Throws on anything else so a
// misconfigured duration fails loudly rather than becoming NaN at runtime.
export function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration "${value}" (expected e.g. 30m, 8h)`);
  }
  return Number(match[1]) * UNIT_SECONDS[match[2]];
}
