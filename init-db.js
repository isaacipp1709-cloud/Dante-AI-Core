require('ts-node/register');
require('./src/lib/database.ts').initDatabase()
  .then(() => { console.log('DB init done'); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
