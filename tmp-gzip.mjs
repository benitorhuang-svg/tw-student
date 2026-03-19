import { createReadStream, createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import path from 'path';

const input = 'backend/data/education-atlas.sqlite';
const output = 'backend/data/education-atlas.sqlite.gz';

const gzip = createGzip({ level: 9 });
const source = createReadStream(input);
const destination = createWriteStream(output);

source.pipe(gzip).pipe(destination).on('finish', () => {
  console.log('Gzip compression complete.');
});
