import { BlobReader, BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import { getSeason, getStandings, type League, type Series } from './kanastats';
import { stringify } from 'csv-stringify/browser/esm/sync';
import { createUrl } from './util';
import { HorizontalAlign, Jimp, JimpMime, loadFont, VerticalAlign } from 'jimp';

interface Props {
  series: Series | undefined;
  league: League | undefined;
}

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

    let iconURLs = Array.from(document.querySelectorAll('.mx-auto'))
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

    if (iconURLs.length === 0) {
      const { registrations } = await getSeason(
        series.organization,
        series.season,
      );

      iconURLs = standings.teams.map(({ name }) => {
        const uuid = registrations.find(
          ({ teamName, logo }) => teamName === name && logo === true,
        )?.team;

        if (!uuid) {
          return {
            team: name,
            icon: null,
          };
        }

        return {
          team: name,
          icon: `https://kanastats.s3-eu-west-1.amazonaws.com/teamlogos/${uuid}.png`,
        };
      });
    }

    const font = await loadFont('/kanaliiga/open-sans-128-white.fnt');

    const icons = teamInfo.map(
      async ({ TeamName, ImageFileName, TeamNumber }) => {
        const url = iconURLs.find((icon) => icon.team === TeamName)?.icon;

        if (!url) {
          return;
        }

        const response = await fetch(createUrl(url));
        const blob = await response.blob();
        const image = await Jimp.fromBuffer(
          await new Response(blob).arrayBuffer(),
        );

        const pixels = Math.round(image.bitmap.width / Math.sqrt(3));
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
            text: TeamNumber,
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

        image.composite(
          background,
          image.bitmap.width - background.bitmap.width,
          image.bitmap.height - background.bitmap.height,
        );

        return zipWriter.add(
          `TeamIcon/${ImageFileName}`,
          new BlobReader(new Blob([await image.getBuffer(JimpMime.png)])),
        );
      },
    );

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
    <button type="button" onClick={onClick}>
      Generate Observer
    </button>
  );
};

export default Observer;
