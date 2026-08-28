export const getVersionNumber = (version: unknown): number => {
  const match = String(version ?? '').match(/\d+/);
  return match ? Number(match[0]) : 0;
};

export const resolveVersionCounts = <T extends { version?: unknown }>(
  rows: T[] = [],
  familyVersionCount = 0,
  latestVersionNumber = 0,
) => {
  const rowCount = rows.length;
  const latestFromRows = rows.reduce(
    (latest, row) => Math.max(latest, getVersionNumber(row.version)),
    0,
  );
  const totalVersionCount = Math.max(0, Number(familyVersionCount) || 0, rowCount);
  const latest = Math.max(0, Number(latestVersionNumber) || 0, latestFromRows);
  return {
    totalVersionCount,
    latestVersionNumber: latest,
    existingCount: totalVersionCount,
    nextVersion: latest + 1,
  };
};
