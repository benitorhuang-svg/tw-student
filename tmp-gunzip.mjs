import { createReadStream, createWriteStream } from 'fs';
import { createGunzip } from 'zlib';

const input = 'data/education-atlas.sqlite.gz';
const output = 'data/education-atlas.sqlite';

const gunzip = createGunzip();
const source = createReadStream(input);
const destination = createWriteStream(output);

source.pipe(gunzip).pipe(destination).on('finish', () => {
  console.log('Gunzip complete.');
});
