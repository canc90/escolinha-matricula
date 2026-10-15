const db = require('../database/connection');

function insert(data) {
  return db('logs').insert(data);
}

module.exports = { insert };
