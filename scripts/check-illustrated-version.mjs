import {readFile} from 'node:fs/promises';
import {validateIllustrations} from '../public/illustrations.js';

const [, , file] = process.argv;
if (!file) throw new Error('Usage: node scripts/check-illustrated-version.mjs editorial/<story-id>.json');
const story = JSON.parse(await readFile(file, 'utf8'));
const version = story.versions.find(item => item.number === 2);
if (!version) throw new Error('Ver.2가 없습니다.');
const images = validateIllustrations(story.id, version);

for (const {src} of images) {
  const bytes = await readFile('public' + src);
  const header = bytes.subarray(0, 12);
  const format = header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP'
    ? 'webp'
    : header.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      ? 'png'
      : header[0] === 255 && header[1] === 216 && header[2] === 255
        ? 'jpeg' : null;
  const extension = src.split('.').at(-1).replace(/^jpg$/, 'jpeg');
  if (!format || format !== extension) throw new Error('이미지 포맷을 확인하세요. ' + src);
}
console.log('Ver.2 삽화 ' + images.length + '장 확인');
