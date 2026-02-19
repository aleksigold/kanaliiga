import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  type Game,
  type League,
  type Registration,
  type Series,
} from '../../service/kanastats';
import Select from '../select';
import {
  fetchGames,
  fetchLandingSpots,
  fetchLeagues,
  fetchSeries,
  isMapKey,
  isMapValue,
  syncSearchParams,
} from './util';
import Observer from '../observer';
import Checkbox from '../checkbox';
import { MAPS, type MapKeys, type MapValues } from './const';
import { debounce, mapKeys, throttle } from 'lodash-es';

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
  const [mapRef, setMapRef] = useState<HTMLDivElement | null>(null);
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
    if (!series || !league || !games || !map) {
      return;
    }

    setLoading(true);

    const gameIds = games
      .filter(({ mapName }) => isMapKey(mapName) && MAPS[mapName] === map)
      .map(({ gameId }) => gameId);

    fetchLandingSpots(
      setHtml,
      series.organization,
      series.season,
      league.key,
      gameIds,
      registrations,
      map,
      setLoading,
    );
  }, [map, games, registrations]);

  useEffect(() => {
    setHtml('');
  }, [series, league, map]);

  useEffect(() => {
    if (!mapRef) {
      return;
    }

    const logos = mapRef.querySelectorAll('.mx-auto');
    const handleMouseEnter = throttle(({ target }: Event) => {
      if (!target || !(target instanceof HTMLElement)) {
        return;
      }

      const parent = target.parentElement?.parentElement;

      if (!parent) {
        return;
      }

      const gameId = target.getAttribute('gameId');
      const svg = parent.querySelector(`svg[gameId="${gameId}"]`);

      if (!(svg instanceof SVGElement)) {
        return;
      }

      svg.style.display = 'block';

      parent
        .querySelectorAll(`.mx-auto[gameId]:not([gameId="${gameId}"])`)
        .forEach((element) => {
          if (!(element instanceof HTMLElement)) {
            return;
          }

          element.style.display = 'none';
        });
    }, 100);

    const handleMouseLeave = debounce(({ target }: Event) => {
      if (!target || !(target instanceof HTMLElement)) {
        return;
      }

      const parent = target.parentElement?.parentElement;

      if (!parent) {
        return;
      }

      parent.querySelectorAll(`svg`).forEach((svg) => {
        svg.style.display = 'none';
      });

      parent.querySelectorAll('.mx-auto').forEach((element) => {
        if (!(element instanceof HTMLElement)) {
          return;
        }

        element.style.display = 'block';
      });
    }, 100);

    logos.forEach((logo) => {
      logo.addEventListener('mouseenter', handleMouseEnter);
      logo.addEventListener('mouseleave', handleMouseLeave);
    });

    return () =>
      logos.forEach((logo) => {
        logo.removeEventListener('mouseenter', handleMouseEnter);
        logo.removeEventListener('mouseleave', handleMouseLeave);
      });
  }, [mapRef]);

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
          onChange={(value) => isMapValue(value) && setMap(value)}
          options={games
            ?.map(({ mapName }) => mapName)
            .filter((mapName, index, array) => array.indexOf(mapName) === index)
            .filter(isMapKey)
            .map((mapName) => MAPS[mapName])}
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
          ref={setMapRef}
        />
      )}
    </>
  );
};

export default LandingSpots;
