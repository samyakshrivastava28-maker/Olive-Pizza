fetch('http://localhost:3000/api/ai/generate-product-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ productName: 'Pepperoni Pizza', description: 'Delicious', category: 'pizza' })
}).then(r => r.json()).then(console.log).catch(console.error);
