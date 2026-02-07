import { BlobReader, BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import {
  getSeason,
  getStandings,
  type League,
  type Registration,
  type Series,
} from './kanastats';
import { stringify } from 'csv-stringify/browser/esm/sync';
import { createUrl } from './util';
import { chunk, countBy, maxBy } from 'lodash-es';
import {
  HorizontalAlign,
  Jimp,
  JimpMime,
  loadFont,
  VerticalAlign,
  type Bitmap,
} from 'jimp';

interface Props {
  series: Series | undefined;
  league: League | undefined;
}

const getMainColor = (bitmap: Bitmap) => {
  const chunked = chunk(bitmap.data, 4).filter(
    ([, , , alpha]) => alpha !== undefined && alpha > 0,
  );

  const count = countBy(chunked);
  const mostCommon = maxBy(Object.entries(count), ([, value]) => value);

  return (
    mostCommon?.[0]
      .split(',')
      .map((value) =>
        parseInt(value, 10).toString(16).padStart(2, '0').toUpperCase(),
      )
      .join('') ?? 'FFFFFFFF'
  );
};

const createLogo = async (
  icon: Awaited<ReturnType<typeof Jimp.fromBuffer>>,
  font: Awaited<ReturnType<typeof loadFont>>,
  teamNumber: number,
) => {
  const pixels = Math.round(icon.bitmap.width / Math.sqrt(3));
  const text = new Jimp({
    width: pixels,
    height: pixels,
  });

  text.print({
    font,
    x: 0,
    y: 0,
    maxWidth: text.bitmap.width,
    maxHeight: text.bitmap.height,
    text: {
      text: teamNumber,
      alignmentX: HorizontalAlign.CENTER,
      alignmentY: VerticalAlign.MIDDLE,
    },
  });

  text.autocrop();
  text.scaleToFit({
    w: pixels,
    h: pixels,
  });

  const background = new Jimp({
    width: pixels,
    height: pixels,
    color: 0x0000007f,
  });

  background.composite(
    text,
    (pixels - text.bitmap.width) / 2,
    (pixels - text.bitmap.height) / 2,
  );

  icon.composite(
    background,
    icon.bitmap.width - background.bitmap.width,
    icon.bitmap.height - background.bitmap.height,
  );

  return icon.getBuffer(JimpMime.png) as unknown as Promise<ArrayBuffer>;
};

const Observer = ({ series, league }: Props) => {
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

    const landingImages = Array.from(document.querySelectorAll('.mx-auto'))
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

    const { registrations } = landingImages.length
      ? { registrations: [] as Registration[] }
      : await getSeason(series.organization, series.season);

    const iconDownloads = standings.teams
      .map(({ name }) => {
        const uuid = registrations.find(
          ({ teamName, logo }) => teamName === name && logo === true,
        )?.team;

        const logo = landingImages.find(({ team }) => team === name)?.icon;

        return {
          team: name,
          url:
            logo ??
            (uuid
              ? `https://kanastats.s3-eu-west-1.amazonaws.com/teamlogos/${uuid}.png`
              : null),
        };
      })
      .map(async ({ team, url }) => {
        if (!url) {
          return {
            team,
            icon: null,
          };
        }

        const response = await fetch(createUrl(url));
        const blob = await response.blob();
        const icon = await Jimp.fromBuffer(
          await new Response(blob).arrayBuffer(),
        );

        return {
          team,
          icon,
        };
      });

    const font = await loadFont('/kanaliiga/open-sans-128-white.fnt');
    const icons = await Promise.all(iconDownloads);

    const editedIcons = teamInfo.map(
      async ({ TeamName, TeamNumber, ImageFileName }, i, arr) => {
        const icon = icons.find(({ team }) => team === TeamName)?.icon;

        if (!icon) {
          return;
        }

        if (arr[i]) {
          arr[i].TeamColor = getMainColor(icon.bitmap);
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

    const anchor = document.createElement('a');
    anchor.download = 'Observer.zip';
    anchor.href = URL.createObjectURL(await zipWriter.close());
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <button type="button" onClick={onClick}>
      Generate Observer
    </button>
  );
};

export default Observer;
