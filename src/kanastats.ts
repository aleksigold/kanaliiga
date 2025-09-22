export interface Series {
  name: string;
  organization: string;
  season: string;
}

interface SeriesResponse {
  series: {
    ongoing: Series[];
  };
}

export interface League {
  gameDays: string[];
  key: string;
  name: string;
}

interface SeasonResponse {
  leagues: League[];
}

export interface Game {
  gameId: string;
  mapName: string;
}

interface GamesResponse {
  games: Game[];
}

const createUrl = (url: string) => {
  return `https://corsproxy.io/?url=${url}`;
};

export const getSeries = async (): Promise<SeriesResponse> => {
  const response = await fetch(
    createUrl('https://kanastats.com/?_data=routes%2F_index'),
  );

  return response.json();
};

export const getSeason = async (
  organization: string,
  season: string,
): Promise<SeasonResponse> => {
  const response = await fetch(
    createUrl(
      `https://kanastats.com/${organization}/${season}?_data=routes%2F%24org.%24serie`,
    ),
  );

  return response.json();
};

export const getGames = async (
  organization: string,
  season: string,
  league: string,
): Promise<GamesResponse> => {
  const response = await fetch(
    createUrl(
      `https://kanastats.com/${organization}/${season}/${league}/games?_data=routes%2F%24org.%24serie.%24group.games._index`,
    ),
  );

  return response.json();
};

export const getLandingSpots = async (
  organization: string,
  season: string,
  league: string,
  gameId: string,
): Promise<string> => {
  const response = await fetch(
    createUrl(
      `https://kanastats.com/${organization}/${season}/${league}/games/${gameId}/landing`,
    ),
  );

  return response.text();
};
