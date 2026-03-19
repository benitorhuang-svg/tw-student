import { createReadStream, createWriteStream } from 'fs';
import { createGunzip } from 'zlib';

const input = 'backend/data/education-atlas.sqlite.gz';
const output = 'backend/data/education-atlas.sqlite';

const gunzip = createGunzip();
const source = createReadStream(input);
const destination = createWriteStream(output);

source.pipe(gunzip).pipe(destination).on('finish', () => {
  console.log('Gunzip complete.');
});
