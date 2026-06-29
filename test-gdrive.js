fetch('http://localhost:3000/api/google-drive/health')
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
