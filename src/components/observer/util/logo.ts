import {
  HorizontalAlign,
  Jimp,
  JimpMime,
  VerticalAlign,
  type Bitmap,
  type loadFont,
} from 'jimp';
import { chunk, countBy, maxBy } from 'lodash-es';
import { createUrl } from '../../../util';

export const getMainColor = (bitmap: Bitmap) => {
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

export const createLogo = async (
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

export const downloadLogo = async (url: string) => {
  const response = await fetch(createUrl(url));
  const blob = await response.blob();
  const buffer = await new Response(blob).arrayBuffer();

  return Jimp.fromBuffer(buffer);
};
