import type { SetURLSearchParams } from 'react-router';
import {
  getGames,
  getSeason,
  getSeries,
  type Game,
  type League,
  type Registration,
  type Series,
} from '../../service/kanastats';
import { MAPS, type MapValues } from './const';

export const fetchSeries = async (
  setter: (series: Series[]) => void,
  setDefault: (selected: Series) => void,
  searchParams: URLSearchParams,
  showPast: boolean,
  showUpcoming: boolean,
) => {
  const {
    series: { ongoing, past, upcoming },
  } = await getSeries();

  const series = [...ongoing];

  if (showPast) {
    series.push(...past);
  }

  if (showUpcoming) {
    series.push(...upcoming);
  }

  const matched = series.find((s) => s.season === searchParams.get('season'));

  if (matched) {
    setDefault(matched);
  } else if (series[0]) {
    setDefault(series[0]);
  }

  setter(series);
};

export const fetchLeagues = async (
  setter: (leagues: League[]) => void,
  setDefault: (league: League) => void,
  setRegistrations: (registrations: Registration[]) => void,
  organization: string,
  season: string,
  searchParams: URLSearchParams,
) => {
  const { leagues, registrations } = await getSeason(organization, season);
  const filtered = leagues.filter(({ gameDays }) => gameDays.length > 0);

  const matched = filtered.find((l) => l.key === searchParams.get('league'));

  if (matched) {
    setDefault(matched);
  } else if (filtered[0]) {
    setDefault(filtered[0]);
  }

  setRegistrations(registrations);
  setter(filtered);
};

export const fetchGames = async (
  setter: (games: Game[]) => void,
  setDefault: (map: MapValues) => void,
  organization: string,
  season: string,
  league: string,
  searchParams: URLSearchParams,
) => {
  const { games } = await getGames(organization, season, league);
  const map = searchParams.get('map');

  if (map) {
    setDefault(map);
  } else if (games[0]) {
    setDefault(MAPS[games[0].mapName as keyof typeof MAPS]);
  }

  setter(games);
};

export const syncSearchParams = (
  setSearchParams: SetURLSearchParams,
  key: string,
  source: any,
  selector?: string,
) => {
  if (!source) {
    return;
  }

  setSearchParams((params) => {
    params.set(key, selector ? source[selector] : source);

    return params;
  });
};
