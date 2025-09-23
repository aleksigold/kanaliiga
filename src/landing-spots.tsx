import { useEffect, useState } from 'react';
import {
  getGames,
  getLandingSpots,
  getSeason,
  getSeries,
  type Game,
  type League,
  type Series,
} from './kanastats';
import Select from './select';

const fetchSeries = async (
  setter: (series: Series[]) => void,
  setDefault: (selected: Series) => void,
) => {
  const {
    series: { ongoing },
  } = await getSeries();

  ongoing[0] && setDefault(ongoing[0]);
  setter(ongoing);
};

const fetchLeagues = async (
  setter: (leagues: League[]) => void,
  setDefault: (league: League) => void,
  organization: string,
  season: string,
) => {
  const { leagues } = await getSeason(organization, season);
  const filtered = leagues.filter(({ gameDays }) => gameDays.length > 0);

  filtered[0] && setDefault(filtered[0]);
  setter(filtered);
};

const fetchGames = async (
  setter: (games: Game[]) => void,
  setDefault: (map: MapValues) => void,
  organization: string,
  season: string,
  league: string,
) => {
  const { games } = await getGames(organization, season, league);

  games[0] && setDefault(MAPS[games[0].mapName as keyof typeof MAPS]);
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
) => {
  const promises = gameIds.map((gameId) =>
    getLandingSpots(organization, season, league, gameId),
  );
  const results = await Promise.all(promises);

  const html = results.map((html, i) => {
    const virtual = document.implementation.createHTMLDocument('virtual');
    virtual.open('replace');
    virtual.writeln(html);

    const map = virtual.querySelector('#map');

    if (!map) {
      return;
    }

    map.querySelectorAll('.mx-auto').forEach((el) => {
      el.setAttribute(
        'onerror',
        'this.src="https://kanastats.com/images/newLogo4.webp"',
      );
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

const LandingSpots = () => {
  const [availableSeries, setAvailableSeries] = useState<Series[]>();
  const [series, setSeries] = useState<Series>();
  const [leagues, setLeagues] = useState<League[]>();
  const [league, setLeague] = useState<League>();
  const [games, setGames] = useState<Game[]>();
  const [map, setMap] = useState<MapValues>();
  const [html, setHtml] = useState<string>();

  useEffect(() => {
    fetchSeries(setAvailableSeries, setSeries);
  }, []);

  useEffect(() => {
    if (!series) {
      return;
    }

    fetchLeagues(setLeagues, setLeague, series.organization, series.season);
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
    );
  }, [map, games]);

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
