fetch('http://localhost:3000/api/ai/enhance-prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'pizza', type: 'banner' })
}).then(r => {
  console.log("Status:", r.status);
  return r.text();
}).then(console.log).catch(console.error);
