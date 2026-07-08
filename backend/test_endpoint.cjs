fetch('https://olive-pizza-backend.onrender.com/api/health/test-fcm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: 'cysllIRtHAV9LfQgeECptZ:APA91bFdsNqKXWx1OcDPiM6SpS5H4xTWm4P2RBQOSTZSmDNnXkPM1paDxQuHIgQyiuUe1Rm33GTlcBLDSVr3iIOK5nDJwsurP8Khv77A3W49l3uYVH1UG58' })
}).then(r => r.json()).then(r => console.log(JSON.stringify(r, null, 2))).catch(console.error);
