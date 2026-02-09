export const MAPS = {
  Baltic_Main: 'Erangel',
  Desert_Main: 'Miramar',
  Neon_Main: 'Rondo',
  Tiger_Main: 'Taego',
};

export type MapKeys = keyof typeof MAPS;
export type MapValues = (typeof MAPS)[MapKeys];
