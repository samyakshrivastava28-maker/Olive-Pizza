import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://res.cloudinary.com/dxmlvkff1/image/upload';
const IMAGE_PATH = 'v1782193174/olive-pizza-logo_frtjey.webp';

const sizes = [192, 256, 384, 512];

async function downloadIcon(size) {
  const url = `${BASE_URL}/w_${size},h_${size},c_pad,b_black/${IMAGE_PATH}`;
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(path.join(process.cwd(), 'public', 'icons', `icon-${size}x${size}.webp`), Buffer.from(buffer));
  console.log(`Downloaded icon-${size}x${size}.webp`);
}

async function downloadMaskable() {
  const url = `${BASE_URL}/w_512,h_512,c_pad,b_black/${IMAGE_PATH}`;
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(path.join(process.cwd(), 'public', 'icons', `maskable-icon-512x512.webp`), Buffer.from(buffer));
  console.log(`Downloaded maskable-icon-512x512.webp`);
}

async function downloadApple() {
  const url = `${BASE_URL}/w_180,h_180,c_pad,b_black/${IMAGE_PATH}`;
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(path.join(process.cwd(), 'public', 'icons', `apple-touch-icon-180x180.webp`), Buffer.from(buffer));
  console.log(`Downloaded apple-touch-icon-180x180.webp`);
}

async function run() {
  for (const size of sizes) {
    await downloadIcon(size);
  }
  await downloadMaskable();
  await downloadApple();
}

run().catch(console.error);
