import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  getGames,
  getLandingSpots,
  getStandings,
  type Game,
  type League,
  type Registration,
  type Series,
} from './kanastats';
import Select from './select';
import { fetchLeagues, fetchSeries, syncSearchParams } from './util';
import { BlobReader, BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import { stringify } from 'csv-stringify/browser/esm/sync';

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

  const onClick = async () => {
    if (!series || !league) {
      return;
    }

    const { standings } = await getStandings(
      series.organization,
      series.season,
      league.key,
    );

    const teamInfo = standings.teams
      .map(({ name, teamId }) => ({
        TeamNumber: parseInt(teamId, 10),
        TeamName: name,
        TeamShortName: name.slice(0, 3).toUpperCase(),
        ImageFileName: `${teamId}.png`,
        TeamColor: 'FFFFFFFF',
      }))
      .sort((a, b) => a.TeamNumber - b.TeamNumber);

    const zipWriter = new ZipWriter(new BlobWriter('application/zip'));

    await zipWriter.add('TeamIcon', undefined, { directory: true });

    console.log(teamInfo);

    const iconURLs = Array.from(document.querySelectorAll('.mx-auto'))
      .filter(
        (el, i, arr) =>
          arr.findIndex(
            (e) => e.getAttribute('alt') === el.getAttribute('alt'),
          ) === i,
      )
      .map((el) => ({
        team: el.getAttribute('alt'),
        icon: el.getAttribute('src'),
      }));

    const icons = teamInfo.map(async ({ TeamName, ImageFileName }) => {
      const url = iconURLs.find((icon) => icon.team === TeamName)?.icon;

      if (!url) {
        return;
      }

      const response = await fetch(url);
      const blob = await response.blob();

      return zipWriter.add(`TeamIcon/${ImageFileName}`, new BlobReader(blob));
    });

    const csv = stringify(teamInfo, { header: true });

    await zipWriter.add('TeamInfo.csv', new TextReader(csv));
    await Promise.all(icons);

    const anchor = document.createElement('a');
    anchor.download = 'Observer.zip';
    anchor.href = URL.createObjectURL(await zipWriter.close());
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()}>
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
        <button type="button" onClick={onClick}>
          Generate Observer
        </button>
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
