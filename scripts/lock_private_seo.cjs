const fs = require('fs');
const path = require('path');

const privateAppIndexPaths = [
  'C:\\Users\\RYZEN\\Downloads\\olive-pizza-owner\\frontend\\index.html',
  'C:\\Users\\RYZEN\\Downloads\\olive-pizza-franchise\\index.html',
  'C:\\Users\\RYZEN\\Downloads\\olive-pizza-restaurant-management\\index.html',
  'C:\\Users\\RYZEN\\Downloads\\olive-pizza-delivery\\index.html',
  'C:\\Users\\RYZEN\\Downloads\\olive-pizza-pos\\index.html'
];

const robotsMetaTag = '    <meta name="robots" content="noindex, nofollow, noarchive" />\n    <meta name="googlebot" content="noindex, nofollow, noarchive" />';

privateAppIndexPaths.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    let html = fs.readFileSync(filePath, 'utf8');
    if (!html.includes('content="noindex, nofollow, noarchive"')) {
      html = html.replace('<head>', `<head>\n${robotsMetaTag}`);
      fs.writeFileSync(filePath, html, 'utf8');
      console.log(`[SEO Lockdown] Injected noindex tags into: ${filePath}`);
    } else {
      console.log(`[SEO Verified] Already locked down: ${filePath}`);
    }
  } else {
    console.warn(`[SEO Warning] File not found: ${filePath}`);
  }
});
