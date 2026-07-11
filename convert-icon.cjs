const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function convert() {
  try {
    const image = await loadImage('public/icons/icon-512x512.webp');
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);
    
    if (!fs.existsSync('assets')) {
      fs.mkdirSync('assets');
    }
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('assets/icon.png', buffer);
    fs.writeFileSync('assets/splash.png', buffer);
    fs.writeFileSync('assets/splash-dark.png', buffer);
    console.log('Converted successfully to assets/icon.png and assets/splash.png');
  } catch (err) {
    console.error('Error converting:', err.message);
  }
}

convert();
