import { createReadStream, createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import path from 'path';

const input = 'data/education-atlas.sqlite';
const output = 'data/education-atlas.sqlite.gz';

const gzip = createGzip({ level: 9 });
const source = createReadStream(input);
const destination = createWriteStream(output);

source.pipe(gzip).pipe(destination).on('finish', () => {
  console.log('Gzip compression complete.');
});
