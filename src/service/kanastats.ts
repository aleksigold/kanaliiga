import { createUrl } from '../util';

export interface Series {
  name: string;
  organization: string;
  season: string;
}

interface SeriesResponse {
  series: {
    ongoing: Series[];
    past: Series[];
    upcoming: Series[];
  };
}

export interface League {
  gameDays: string[];
  key: string;
  name: string;
}

export interface Registration {
  group: string;
  leagues: string[];
  team: string;
  teamName: string;
  logo: string | boolean;
}

interface SeasonResponse {
  leagues: League[];
  registrations: Registration[];
}

export interface Game {
  gameId: string;
  mapName: string;
}

interface GamesResponse {
  games: Game[];
}

interface Team {
  name: string;
  teamId: string;
}

interface Standings {
  teams: Team[];
}

interface StandingsResponse {
  standings: Standings;
}

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

  if (response.status !== 200) {
    throw new Error('Failed to fetch landing spots');
  }

  return response.text();
};

export const getStandings = async (
  organization: string,
  season: string,
  league: string,
): Promise<StandingsResponse> => {
  const response = await fetch(
    createUrl(
      `https://kanastats.com/${organization}/${season}/${league}/teams/standings?_data=routes%2F%24org.%24serie.%24group.teams`,
    ),
  );

  return response.json();
};
