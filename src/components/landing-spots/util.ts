import type { SetURLSearchParams } from 'react-router';
import {
  getGames,
  getLandingSpots,
  getSeason,
  getSeries,
  type Game,
  type League,
  type Registration,
  type Series,
} from '../../service/kanastats';
import {
  IMG_FALLBACK,
  MAP_SIZES,
  MAPS,
  type MapKeys,
  type MapValues,
} from './const';
import {
  getMatch,
  getTelemetry,
  type Asset,
  type LogVehicle,
  type Location,
} from '../../service/pubg';

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

  if (map && isMapValue(map)) {
    setDefault(map);
  } else if (games[0] && isMapKey(games[0].mapName)) {
    setDefault(MAPS[games[0].mapName]);
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

const getFlightPath = async (
  matchId: string,
  mapName: MapValues,
): Promise<Location[]> => {
  const { included } = await getMatch(matchId);
  const telemetryUrl = included.find((i): i is Asset => i.type === 'asset')
    ?.attributes.URL;

  if (!telemetryUrl) {
    throw new Error('Could not find asset URL');
  }

  const telemetry = await getTelemetry(telemetryUrl);
  const vehicleLogs = telemetry
    .filter((log): log is LogVehicle =>
      ['LogVehicleLeave', 'LogVehicleRide'].includes(log._T),
    )
    .filter(({ vehicle }) => vehicle.vehicleId === 'DummyTransportAircraft_C');

  const start = vehicleLogs.find((log) => log._T === 'LogVehicleRide');
  const end = vehicleLogs.findLast((log) => log._T === 'LogVehicleLeave');

  if (!start || !end) {
    throw new Error('Could not find start or end log');
  }

  const mapSize = MAP_SIZES[mapName];

  return [start, end]
    .map(({ vehicle }) => vehicle.location)
    .map(({ x, y }) => ({
      x: Math.max(0, x),
      y: Math.max(0, y),
    }))
    .map(({ x, y }) => ({
      x: Math.min(mapSize, x),
      y: Math.min(mapSize, y),
    }));
};

export const fetchLandingSpots = async (
  setter: (html: string) => void,
  organization: string,
  season: string,
  league: string,
  gameIds: string[],
  registrations: Registration[],
  mapName: MapValues,
  setLoading: (loading: boolean) => void,
) => {
  const results: [string, string, Location[]][] = [];

  for (let gameId of gameIds) {
    try {
      const result = await getLandingSpots(
        organization,
        season,
        league,
        gameId,
      );

      try {
        const flightPath = await getFlightPath(gameId, mapName);

        results.push([gameId, result, flightPath]);
      } catch (e) {
        console.error(`Failed to fetch flight path for game ${gameId}`, e);
        results.push([gameId, result, []]);
      }
    } catch (e) {
      console.error(`Failed to fetch landing spots for game ${gameId}:`, e);
    }
  }

  const html = results.map(([gameId, html, [start, end]], i) => {
    const virtual = document.implementation.createHTMLDocument('virtual');
    virtual.open('replace');
    virtual.writeln(html);

    const map = virtual.querySelector('#map');

    if (!map) {
      return;
    }

    map.querySelectorAll('.mx-auto').forEach((el) => {
      const alt = el.getAttribute('alt');
      const team = registrations.find((r) => r.teamName === alt)?.team;
      const url = team
        ? `https://kanastats.s3-eu-west-1.amazonaws.com/teamlogos/${team}.png`
        : IMG_FALLBACK;

      el.setAttribute(
        'onerror',
        `if (this.src.includes('amazonaws.com')) { this.src="${IMG_FALLBACK}" } else { this.src="${url}" }`,
      );
      el.setAttribute('gameId', gameId);
    });

    const mapSize = MAP_SIZES[mapName];

    if (start !== undefined && end !== undefined) {
      const svg = virtual.createElement('svg');
      svg.setAttribute('width', '1024');
      svg.setAttribute('viewBox', `0 0 ${mapSize} ${mapSize}`);
      svg.setAttribute(
        'style',
        'position: absolute; top: 0; left: 0; display: none;',
      );
      svg.setAttribute('gameId', gameId);

      const line = virtual.createElement('line');
      line.setAttribute('stroke', 'white');
      line.setAttribute('x1', start.x.toString());
      line.setAttribute('y1', start.y.toString());
      line.setAttribute('x2', end.x.toString());
      line.setAttribute('y2', end.y.toString());
      line.setAttribute('stroke-width', '2500');
      svg.appendChild(line);

      map.append(svg);
    }

    if (i === 0) {
      const img = map.querySelector('#mapImg');

      img?.setAttribute(
        'src',
        `https://kanastats.com${img.getAttribute('src')}`,
      );

      return map.outerHTML;
    }

    return [
      ...Array.from(map.querySelectorAll('.mx-auto')),
      ...Array.from(map.querySelectorAll('svg')),
    ]
      .map((el) => el.outerHTML)
      .join('');
  });

  setLoading(false);
  setter(html.join(''));
};

export const isMapKey = (value: string): value is MapKeys =>
  Object.keys(MAPS).some((name) => name === value);

export const isMapValue = (value: string | undefined): value is MapValues =>
  Object.values(MAPS).some((v) => v === value);
