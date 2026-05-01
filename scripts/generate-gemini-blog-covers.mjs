#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('GEMINI_API_KEY is required');
  process.exit(1);
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image';
const OUTPUT_DIR = path.resolve('public/images/blog');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const items = [
  {
    file: 'open-07.webp',
    prompt:
      'Editorial digital illustration, 16:9. White grass carp and silver carp swimming in a healthy private pond with water plants. Clean natural colors, realistic style, soft light, detailed water texture, no text, no logo.'
  },
  {
    file: 'open-08.webp',
    prompt:
      'Editorial digital illustration, 16:9. Common carp, mirror carp, wild carp and tench in one freshwater pond scene, clear separation of fish species, natural reeds and calm water, realistic, no text, no logo.'
  },
  {
    file: 'open-09.webp',
    prompt:
      'Editorial digital illustration, 16:9. Freshwater predator fish concept: pike in foreground, zander, perch and catfish in depth, dramatic underwater composition, realistic details, no text, no logo.'
  },
  {
    file: 'open-10.webp',
    prompt:
      'Editorial digital illustration, 16:9. Decorative koi pond in a garden, colorful koi fish, water lilies, stones and clean water, premium landscape look, realistic illustration style, no text, no logo.'
  },
  {
    file: 'open-11.webp',
    prompt:
      'Editorial digital illustration, 16:9. Premium fish for pond: sturgeon and trout in deep cool water, elegant and high-end visual mood, realistic aquatic lighting, no text, no logo.'
  },
  {
    file: 'open-12.webp',
    prompt:
      'Editorial digital illustration, 16:9. Winter pond preparation scene with thin ice, aeration hole and calm snowy shoreline, subtle fish silhouettes under water, realistic, no text, no logo.'
  },
  {
    file: 'open-13.webp',
    prompt:
      'Editorial digital illustration, 16:9. Fish stocking management concept in a private pond: balanced number of fish and healthy water ecosystem, professional aquaculture visual, realistic style, no text, no logo.'
  },
  {
    file: 'open-14.webp',
    prompt:
      'Editorial digital illustration, 16:9. Controlled fish feeding in a pond, measured pellets, active carp near surface, clear water and clean pond edge, realistic illustration style, no text, no logo.'
  },
  {
    file: 'open-15.webp',
    prompt:
      'Editorial digital illustration, 16:9. Pond ecosystem close-up with freshwater mussels, zebra mussels and crayfish on natural bottom, aquatic plants and clean water, realistic style, no text, no logo.'
  },
  {
    file: 'open-16.webp',
    prompt:
      'Editorial digital illustration, 16:9. Pond stocking mistakes and solutions concept as one coherent scene: stressed murky side versus healthy balanced side in one pond, realistic and informative mood, no text, no logo.'
  }
];

const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const generateOne = async ({ file, prompt }, index, total) => {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['Image'],
      imageConfig: {
        aspectRatio: '16:9'
      }
    }
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Gemini API ${res.status} for ${file}: ${details.slice(0, 600)}`);
  }

  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => part?.inlineData?.data);

  if (!imagePart) {
    const textPart = parts.find((part) => typeof part?.text === 'string')?.text ?? 'No image in response';
    throw new Error(`No image for ${file}. Response text: ${textPart.slice(0, 400)}`);
  }

  const mime = imagePart.inlineData.mimeType || 'image/png';
  const raw = Buffer.from(imagePart.inlineData.data, 'base64');
  const tmpExt = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
  const tmpPath = path.join(OUTPUT_DIR, `.tmp-${file}.${tmpExt}`);
  const outPath = path.join(OUTPUT_DIR, file);

  fs.writeFileSync(tmpPath, raw);

  if (tmpExt === 'webp') {
    // Normalize output size for consistent card crops.
    execFileSync('cwebp', ['-q', '84', '-mt', '-resize', '1600', '0', tmpPath, '-o', outPath], {
      stdio: 'ignore'
    });
  } else {
    execFileSync('cwebp', ['-q', '84', '-mt', '-resize', '1600', '0', tmpPath, '-o', outPath], {
      stdio: 'ignore'
    });
  }

  fs.unlinkSync(tmpPath);
  console.log(`[${index + 1}/${total}] ${file} generated`);
};

const run = async () => {
  for (let i = 0; i < items.length; i += 1) {
    await generateOne(items[i], i, items.length);
  }
  console.log('Done: generated all blog covers');
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

