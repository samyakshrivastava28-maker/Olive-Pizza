const fs = require('fs');

try {
    const html = fs.readFileSync('pizza-loader-animation_5673819.htm', 'utf8');
    console.log("File loaded, size:", html.length);
    
    // Check if there are any massive string literals in the Nuxt state payload
    // or if the JSON is just URL encoded or base64 encoded.
    // Lottie JSON structure: {"v":"...","fr":...}
    // Search for 'fr' and 'layers' which are essential for lottie
    
    let regex = /\{.*?\"layers\".*?\}/;
    let match = html.match(regex);
    if (match) {
        console.log("Found layers object. Length:", match[0].length);
    } else {
        console.log("No layers object found using plain search.");
    }
    
    // Maybe it's inside an attribute like `<lottie-player src="data:application/json;base64,...">`
    const base64Regex = /data:application\/json;base64,([A-Za-z0-9+/=]+)/;
    const b64Match = html.match(base64Regex);
    if (b64Match) {
        console.log("Found base64 encoded json!");
        const decoded = Buffer.from(b64Match[1], 'base64').toString('utf8');
        fs.writeFileSync('frontend/src/assets/pizza-loader.json', decoded);
        console.log("Saved to pizza-loader.json! Length:", decoded.length);
    } else {
        console.log("No base64 json found.");
    }

    // Let's just output the longest tags or strings
    const strings = html.match(/[^"']{1000,}/g);
    if (strings) {
        const longest = strings.sort((a,b) => b.length - a.length)[0];
        console.log("Longest string found length:", longest.length);
        console.log("Starts with:", longest.substring(0, 100));
        
        // If it starts with lottie-player, maybe it's just the lottie JSON but unquoted?
    }
} catch(e) {
    console.error(e);
}
