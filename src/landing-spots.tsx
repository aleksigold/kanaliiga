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

const fetchSeries = async (setter: (series: Series[]) => void) => {
  const { series } = await getSeries();

  setter(series.ongoing);
};

const fetchLeagues = async (
  setter: (leagues: League[]) => void,
  organization: string,
  season: string,
) => {
  const { leagues } = await getSeason(organization, season);

  setter(leagues.filter(({ gameDays }) => gameDays.length > 0));
};

const fetchGames = async (
  setter: (games: Game[]) => void,
  organization: string,
  season: string,
  league: string,
) => {
  const { games } = await getGames(organization, season, league);

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
  const workspace = document.createElement('div');
  workspace.setAttribute('style', 'display: none;');

  const html = results.map((html, i) => {
    workspace.innerHTML = html;

    const map = workspace.querySelector('#map');

    if (!map) {
      return;
    }

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

  workspace.remove();

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
    fetchSeries(setAvailableSeries);
  }, []);

  useEffect(() => {
    if (!series) {
      return;
    }

    fetchLeagues(setLeagues, series.organization, series.season);
  }, [series]);

  useEffect(() => {
    if (!league || !series) {
      return;
    }

    fetchGames(setGames, series.organization, series.season, league.key);
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

  return (
    <>
      <form>
        <Select
          onChange={(value) =>
            setSeries(availableSeries?.find(({ name }) => name === value))
          }
          options={availableSeries?.map(({ name }) => name)}
          defaultOption="Select series"
          id="series"
          value={series?.name}
          label="Series"
        />
        <Select
          onChange={(value) =>
            setLeague(leagues?.find(({ name }) => name === value))
          }
          options={leagues?.map(({ name }) => name)}
          defaultOption="Select league"
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
          defaultOption="Select map"
          id="map"
          value={map}
          label="Map"
        />
      </form>
      {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
    </>
  );
};

export default LandingSpots;
