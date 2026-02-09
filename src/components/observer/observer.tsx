import { BlobReader, BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import {
  getSeason,
  getStandings,
  type League,
  type Registration,
  type Series,
} from '../../service/kanastats';
import { stringify } from 'csv-stringify/browser/esm/sync';
import { loadFont } from 'jimp';
import { download } from './util/file';
import { createLogo, downloadLogo, getMainColor } from './util/logo';
import { uniqBy } from 'lodash-es';

interface Props {
  series: Series | undefined;
  league: League | undefined;
}

const FONT = '/kanaliiga/open-sans-128-white.fnt';

const onClick = (series?: Series, league?: League) => async () => {
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

  const landingImages = uniqBy(
    Array.from(document.querySelectorAll('.mx-auto')),
    (el) => el.getAttribute('alt'),
  ).map((el) => ({
    team: el.getAttribute('alt'),
    icon: el.getAttribute('src'),
  }));

  const registrations: Registration[] = [];

  if (landingImages.length === 0) {
    const season = await getSeason(series.organization, series.season);

    registrations.push(...season.registrations);
  }

  const iconDownloads = standings.teams
    .map(({ name }) => {
      const logo = landingImages.find(({ team }) => team === name)?.icon;

      if (logo) {
        return {
          team: name,
          url: logo,
        };
      }

      const uuid = registrations.find(
        ({ teamName, logo }) => teamName === name && logo === true,
      )?.team;

      return {
        team: name,
        url: uuid
          ? `https://kanastats.s3-eu-west-1.amazonaws.com/teamlogos/${uuid}.png`
          : null,
      };
    })
    .map(async ({ team, url }) => {
      if (!url) {
        return {
          team,
          icon: null,
        };
      }

      const icon = await downloadLogo(url);

      return {
        team,
        icon,
      };
    });

  const font = await loadFont(FONT);

  iconDownloads.forEach(async (iconDownload) => {
    const { team, icon } = await iconDownload;

    if (!icon) {
      return;
    }

    const entry = teamInfo.find(({ TeamName }) => TeamName === team);

    if (!entry) {
      return;
    }

    entry.TeamColor = getMainColor(icon.bitmap);
  });

  const icons = await Promise.all(iconDownloads);

  const editedIcons = teamInfo.map(
    async ({ TeamName, TeamNumber, ImageFileName }) => {
      const icon = icons.find(({ team }) => team === TeamName)?.icon;

      if (!icon) {
        return;
      }

      const buffer = await createLogo(icon, font, TeamNumber);

      return zipWriter.add(
        `TeamIcon/${ImageFileName}`,
        new BlobReader(new Blob([buffer])),
      );
    },
  );

  const csv = stringify(teamInfo, { header: true });

  await zipWriter.add('TeamInfo.csv', new TextReader(csv));
  await Promise.all(editedIcons);

  const blob = await zipWriter.close();

  download('Observer.zip', blob);
};

const Observer = ({ series, league }: Props) => {
  return (
    <button type="button" onClick={onClick(series, league)}>
      Generate Observer
    </button>
  );
};

export default Observer;
