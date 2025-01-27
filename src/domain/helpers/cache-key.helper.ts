export const generateCacheKey = {
  clubsIds: (placeId: string) => `club_ids:${placeId}`,
  club: (clubId: number) => `club:${clubId}`,
  courts: (clubId: number) => `courts:${clubId}`,
  slots: (clubId: number, courtId: number, date: Date) =>
    `slots:${clubId}:${courtId}:${date.toISOString().split('T')[0]}`,
} as const;
