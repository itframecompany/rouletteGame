const mysql = require('mysql');

module.exports = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'majorskins',
    supportBigNumbers: true,
    charset: 'utf8mb4'
});