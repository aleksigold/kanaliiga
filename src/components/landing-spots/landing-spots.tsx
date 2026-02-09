import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  getLandingSpots,
  type Game,
  type League,
  type Registration,
  type Series,
} from '../../service/kanastats';
import Select from '../select';
import {
  fetchGames,
  fetchLeagues,
  fetchSeries,
  syncSearchParams,
} from './util';
import Observer from '../observer';
import Checkbox from '../checkbox';
import { MAPS, type MapKeys, type MapValues } from './const';

const fetchLandingSpots = async (
  setter: (html: string) => void,
  organization: string,
  season: string,
  league: string,
  gameIds: string[],
  registrations: Registration[],
  setLoading: (loading: boolean) => void,
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

  setLoading(false);
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
  const [loading, setLoading] = useState(false);
  const [showPast, setShowPast] = useState(
    searchParams.get('showPast') === 'true',
  );
  const [showUpcoming, setShowUpcoming] = useState(
    searchParams.get('showUpcoming') === 'true',
  );

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
    syncSearchParams(setSearchParams, 'showPast', showPast ? 'true' : 'false');
  }, [showPast, setSearchParams]);

  useEffect(() => {
    syncSearchParams(
      setSearchParams,
      'showUpcoming',
      showUpcoming ? 'true' : 'false',
    );
  }, [showUpcoming, setSearchParams]);

  useEffect(() => {
    fetchSeries(
      setAvailableSeries,
      setSeries,
      searchParams,
      showPast,
      showUpcoming,
    );
  }, [showPast, showUpcoming]);

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

    setLoading(true);

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
      setLoading,
    );
  }, [map, games, registrations]);

  useEffect(() => {
    setHtml('');
  }, [series, league, map]);

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
        <Checkbox
          checked={showPast}
          onChange={() => setShowPast(!showPast)}
          name="showPast"
        >
          Show past
        </Checkbox>
        <Checkbox
          checked={showUpcoming}
          onChange={() => setShowUpcoming(!showUpcoming)}
          name="showUpcoming"
        >
          Show upcoming
        </Checkbox>
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
        <Observer series={series} league={league} />
      </form>
      {loading && <p>Loading...</p>}
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
