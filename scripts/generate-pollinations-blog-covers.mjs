#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const OUTPUT_DIR = path.resolve('public/images/blog');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const items = [
  {
    file: 'open-07',
    seed: 1707,
    prompt:
      'Editorial digital illustration, white grass carp and silver carp in a healthy private pond, aquatic plants, clear freshwater, natural colors, no text, no logo'
  },
  {
    file: 'open-08',
    seed: 1708,
    prompt:
      'Editorial digital illustration, common carp, mirror carp, wild carp and tench in one pond ecosystem, realistic fish anatomy, calm water, no text, no logo'
  },
  {
    file: 'open-09',
    seed: 1709,
    prompt:
      'Editorial digital illustration, freshwater predatory fish scene with pike, zander, perch and catfish underwater, dramatic but realistic, no text, no logo'
  },
  {
    file: 'open-10',
    seed: 1710,
    prompt:
      'Editorial digital illustration, decorative garden pond with colorful koi fish, lily pads, clean clear water, premium landscaping mood, no text, no logo'
  },
  {
    file: 'open-11',
    seed: 1711,
    prompt:
      'Editorial digital illustration, premium fish concept with sturgeon and trout in deep cool pond water, elegant visual style, no text, no logo'
  },
  {
    file: 'open-12',
    seed: 1712,
    prompt:
      'Editorial digital illustration, winter pond preparation, thin ice, aeration opening, snowy shoreline, subtle fish under water, no text, no logo'
  },
  {
    file: 'open-13',
    seed: 1713,
    prompt:
      'Editorial digital illustration, fish stocking density management concept for a private pond, balanced ecosystem, healthy water, no text, no logo'
  },
  {
    file: 'open-14',
    seed: 1714,
    prompt:
      'Editorial digital illustration, controlled fish feeding in a pond with measured pellets, active carp near surface, clear water, no text, no logo'
  },
  {
    file: 'open-15',
    seed: 1715,
    prompt:
      'Editorial digital illustration, pond ecosystem close-up with freshwater mussels, zebra mussels and crayfish on natural bottom, no text, no logo'
  },
  {
    file: 'open-16',
    seed: 1716,
    prompt:
      'Editorial digital illustration, pond stocking mistakes and solutions concept, healthy ecosystem versus murky overloaded pond, no text, no logo'
  }
];

const buildUrl = (prompt, seed) => {
  const encodedPrompt = encodeURIComponent(prompt);
  const params = new URLSearchParams({
    model: 'flux',
    seed: String(seed),
    width: '1600',
    height: '900',
    nologo: 'true',
    enhance: 'true',
    safe: 'true'
  });
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;
};

for (let i = 0; i < items.length; i += 1) {
  const { file, prompt, seed } = items[i];
  const jpgPath = path.join(OUTPUT_DIR, `${file}.jpg`);
  const webpPath = path.join(OUTPUT_DIR, `${file}.webp`);
  const url = buildUrl(prompt, seed);

  execFileSync(
    'curl',
    ['-L', '--fail', '--max-time', '60', '--retry', '2', '--retry-delay', '2', '-o', jpgPath, url],
    { stdio: 'ignore' }
  );

  execFileSync('cwebp', ['-q', '84', '-mt', '-resize', '1600', '0', jpgPath, '-o', webpPath], {
    stdio: 'ignore'
  });

  fs.unlinkSync(jpgPath);
  console.log(`[${i + 1}/${items.length}] ${path.basename(webpPath)} generated`);
}

console.log('Done: generated all covers via Pollinations');
