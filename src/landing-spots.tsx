import { useEffect, useState } from 'react';
import { useSearchParams, type SetURLSearchParams } from 'react-router';
import {
  getGames,
  getLandingSpots,
  getSeason,
  getSeries,
  type Game,
  type League,
  type Registration,
  type Series,
} from './kanastats';
import Select from './select';

const fetchSeries = async (
  setter: (series: Series[]) => void,
  setDefault: (selected: Series) => void,
  searchParams: URLSearchParams,
) => {
  const {
    series: { ongoing },
  } = await getSeries();

  const matched = ongoing.find((s) => s.season === searchParams.get('season'));

  if (matched) {
    setDefault(matched);
  } else if (ongoing[0]) {
    setDefault(ongoing[0]);
  }

  setter(ongoing);
};

const fetchLeagues = async (
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

const fetchGames = async (
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

const MAPS = {
  Baltic_Main: 'Erangel',
  Desert_Main: 'Miramar',
  Neon_Main: 'Rondo',
  Tiger_Main: 'Taego',
};

type MapKeys = keyof typeof MAPS;
type MapValues = (typeof MAPS)[MapKeys];

const fetchLandingSpots = async (
  setter: (html: string) => void,
  organization: string,
  season: string,
  league: string,
  gameIds: string[],
  registrations: Registration[],
) => {
  const results: string[] = [];

  for (let gameId of gameIds) {
    try {
      const result = await getLandingSpots(
        organization,
        season,
        league,
        gameId,
      );

      results.push(result);
    } catch (e) {
      console.error(`Failed to fetch landing spots for game ${gameId}:`, e);
    }
  }

  const html = results.map((html, i) => {
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
        : 'https://kanastats.com/images/newLogo4.webp';

      el.setAttribute('onerror', `this.src="${url}"`);
    });

    if (i === 0) {
      const img = map.querySelector('#mapImg');

      img?.setAttribute(
        'src',
        `https://kanastats.com${img.getAttribute('src')}`,
      );

      return map?.outerHTML;
    }

    return Array.from(map.querySelectorAll('.mx-auto'))
      .map((el) => el.outerHTML)
      .join('');
  });

  setter(html.join(''));
};

const syncSearchParams = (
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

const LandingSpots = () => {
  const [availableSeries, setAvailableSeries] = useState<Series[]>();
  const [series, setSeries] = useState<Series>();
  const [leagues, setLeagues] = useState<League[]>();
  const [league, setLeague] = useState<League>();
  const [games, setGames] = useState<Game[]>();
  const [map, setMap] = useState<MapValues>();
  const [html, setHtml] = useState<string>();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    syncSearchParams(setSearchParams, 'season', series, 'season');
  }, [series, setSearchParams]);

  useEffect(() => {
    syncSearchParams(setSearchParams, 'league', league, 'key');
  }, [league, setSearchParams]);

  useEffect(() => {
    syncSearchParams(setSearchParams, 'map', map);
  }, [map, setSearchParams]);

  useEffect(() => {
    fetchSeries(setAvailableSeries, setSeries, searchParams);
  }, []);

  useEffect(() => {
    if (!series) {
      return;
    }

    fetchLeagues(
      setLeagues,
      setLeague,
      setRegistrations,
      series.organization,
      series.season,
      searchParams,
    );
  }, [series]);

  useEffect(() => {
    if (!league || !series) {
      return;
    }

    fetchGames(
      setGames,
      setMap,
      series.organization,
      series.season,
      league.key,
      searchParams,
    );
  }, [league]);

  useEffect(() => {
    if (!series || !league || !games) {
      return;
    }

    const gameIds = games
      .filter(({ mapName }) => MAPS[mapName as MapKeys] === map)
      .map(({ gameId }) => gameId);

    fetchLandingSpots(
      setHtml,
      series.organization,
      series.season,
      league.key,
      gameIds,
      registrations,
    );
  }, [map, games, registrations]);

  useEffect(() => {
    setHtml('');
  }, [series, league, map]);

  return (
    <>
      <form>
        <Select
          onChange={(value) =>
            setSeries(availableSeries?.find(({ name }) => name === value))
          }
          options={availableSeries?.map(({ name }) => name)}
          id="series"
          value={series?.name}
          label="Series"
        />
        <Select
          onChange={(value) =>
            setLeague(leagues?.find(({ name }) => name === value))
          }
          options={leagues?.map(({ name }) => name)}
          id="league"
          value={league?.name}
          label="League"
        />
        <Select
          onChange={setMap}
          options={games
            ?.map(({ mapName }) => mapName)
            .filter((mapName, index, array) => array.indexOf(mapName) === index)
            .map((mapName) => MAPS[mapName as MapKeys])}
          id="map"
          value={map}
          label="Map"
        />
      </form>
      {html && (
        <div
          style={{ position: 'relative' }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </>
  );
};

export default LandingSpots;
