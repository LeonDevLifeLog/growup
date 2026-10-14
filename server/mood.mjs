/** Calendar dates and care states use Shanghai days, independent of host TZ. */
export function shanghaiDate(value = new Date()) {
  return new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function shiftDate(date, days) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
}

export function careStatus(checkins, today) {
  const sorted = [...checkins].sort((a, b) => b.date.localeCompare(a.date));
  const lastCheckin = sorted[0]?.date ?? null;
  if (!lastCheckin || lastCheckin < shiftDate(today, -1)) {
    return { status: "gray", lowDays: 0, lastCheckin };
  }
  let lowDays = 0;
  let stableDays = 0;
  let expected = lastCheckin;
  for (const entry of sorted) {
    if (entry.date !== expected || entry.score > 2) break;
    lowDays += 1;
    expected = shiftDate(expected, -1);
  }
  expected = lastCheckin;
  for (const entry of sorted) {
    if (entry.date !== expected || entry.score < 3) break;
    stableDays += 1;
    expected = shiftDate(expected, -1);
  }
  return {
    status:
      lowDays >= 5
        ? "red"
        : lowDays >= 3
          ? "yellow"
          : stableDays >= 7
            ? "green"
            : "gray",
    lowDays,
    lastCheckin,
  };
}

export function currentStreak(checkins, today) {
  const dates = new Set(checkins.map((entry) => entry.date));
  let cursor = dates.has(today) ? today : shiftDate(today, -1);
  let count = 0;
  while (dates.has(cursor)) {
    count += 1;
    cursor = shiftDate(cursor, -1);
  }
  return count;
}
