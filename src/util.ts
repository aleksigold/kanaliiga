import type { SetURLSearchParams } from 'react-router';
import {
  getSeason,
  getSeries,
  type League,
  type Registration,
  type Series,
} from './kanastats';

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
