const mysql = require('mysql');
const defaultConf = require('./conf');

let globalDBConf = defaultConf;

const getConnection = (conf = globalDBConf) => mysql.createConnection(conf);

// set database connection configuration
exports.setDBConf = (conf) => {
  globalDBConf = conf;
};

// get database connection
exports.getConnection = getConnection;
