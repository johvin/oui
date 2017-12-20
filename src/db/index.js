const mysql = require('mysql');
const conf = require('./conf');

const getConnection = () => mysql.createConnection(conf);

exports.getConnection = getConnection;
