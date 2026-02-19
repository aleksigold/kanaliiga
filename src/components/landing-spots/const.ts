export const MAPS = {
  Baltic_Main: 'Erangel' as const,
  Desert_Main: 'Miramar' as const,
  Neon_Main: 'Rondo' as const,
  Tiger_Main: 'Taego' as const,
  DihorOtok_Main: 'Vikendi' as const,
};

export type MapKeys = keyof typeof MAPS;
export type MapValues = (typeof MAPS)[MapKeys];

export const MAP_SIZES: Record<MapValues, number> = {
  Erangel: 816000,
  Miramar: 816000,
  Rondo: 816000,
  Taego: 816000,
  Vikendi: 816000,
};
