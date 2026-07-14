const fs = require('fs');

const content = fs.readFileSync('pizza-loader-animation_5673819.htm', 'utf8');

// A Lottie JSON always starts with {"v":"
const idx = content.indexOf('{"v":"');

if (idx !== -1) {
    // Find the end by parsing JSON incrementally or just looking for the last }}
    // The safest way is to find the script tag end or the last }} before the script tag ends
    
    // Actually, Lottie JSON might just be a string literal in a script tag if it was dumped as JS
    // Let's just find the first occurrence of {"v":"
    
    // A Lottie file is an object, so we count curly braces
    let openBraces = 0;
    let endIdx = -1;
    let inString = false;
    let escape = false;

    for (let i = idx; i < content.length; i++) {
        const char = content[i];
        if (escape) {
            escape = false;
            continue;
        }
        if (char === '\\') {
            escape = true;
            continue;
        }
        if (char === '"') {
            inString = !inString;
            continue;
        }
        if (!inString) {
            if (char === '{') {
                openBraces++;
            } else if (char === '}') {
                openBraces--;
                if (openBraces === 0) {
                    endIdx = i;
                    break;
                }
            }
        }
    }

    if (endIdx !== -1) {
        const jsonStr = content.substring(idx, endIdx + 1);
        try {
            JSON.parse(jsonStr); // validate
            
            // Ensure directory exists
            if (!fs.existsSync('frontend/src/assets')) {
                fs.mkdirSync('frontend/src/assets', { recursive: true });
            }
            
            fs.writeFileSync('frontend/src/assets/pizza-loader.json', jsonStr);
            console.log('Successfully wrote to frontend/src/assets/pizza-loader.json, length: ' + jsonStr.length);
        } catch(e) {
            console.error('Extracted string is not valid JSON:', e.message);
        }
    } else {
        console.log('Could not find matching end brace for Lottie JSON');
    }
} else {
    console.log('Lottie JSON start token ({"v":") not found');
}
