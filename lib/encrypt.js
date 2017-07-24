// Create hash for password
// Usage: node encrypt.js <your_password>

var bcrypt = require('bcrypt-nodejs');
var password = process.argv.slice(2);
var hash = bcrypt.hashSync(password);

console.log('This is your encrypted password:');
console.log(hash); 
