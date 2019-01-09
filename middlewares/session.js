const session = require('express-session');

const RedisStore = require('connect-redis')(session);

const client = require('../libs/redis').client;

module.exports = session({
    name: 'major',
    store: new RedisStore({client}),
    secret: 'LQ497BwWKw^+eGt7',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true
    }
});
