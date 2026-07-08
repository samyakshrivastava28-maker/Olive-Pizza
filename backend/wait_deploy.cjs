const https = require('https');

function check() {
  https.get('https://olive-pizza-backend.onrender.com/api/health/status', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.uptime < 30) {
          console.log('New deployment is live! Uptime:', json.uptime);
          process.exit(0);
        } else {
          console.log('Still old deployment. Uptime:', json.uptime);
          setTimeout(check, 5000);
        }
      } catch (e) {
        console.error('Error parsing JSON:', data);
        setTimeout(check, 5000);
      }
    });
  }).on('error', (err) => {
    console.error('Request error:', err);
    setTimeout(check, 5000);
  });
}

check();
