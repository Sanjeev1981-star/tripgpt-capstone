require('dotenv').config();
const fs = require('fs');
const path = require('path');

const key = process.env.GEMINI_API_KEY || "";
const info = `Key Length: ${key.length}, Starts with: ${key.substring(0, 5)}`;
console.log(info);
fs.writeFileSync(path.join(__dirname, 'key_info.txt'), info);
