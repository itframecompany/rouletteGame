const _ = require('lodash');
const Queue = require('bull');

require('log4js').replaceConsole();

const db = require('../libs/db');
const redis = require('../libs/redis').client;
const config = require('../config');

const DepositOffer = require('./models/offer/deposit');
const WithdrawOffer = require('./models/offer/withdraw');
const Trade = require('./models/trade');

const tradeClassMap = {
    deposit: require('./models/trade/deposit'),
    withdraw: require('./models/trade/withdraw')
};

const depositQueue = Queue('deposit');
const withdrawQueue = Queue('withdraw');

depositQueue.process(500, (job, done) => {
    const offer = new DepositOffer(job.data.user, job.data.assetIds);
    offer.on('done', done);
});

withdrawQueue.process(500, (job, done) => {
    const offer = new WithdrawOffer(job.data.user, job.data.itemIds);
    offer.on('done', done);
});

// Start polling trades that remained pending after restart
db.query(`select * from ${config.tables.trade} where state = ?`, Trade.state.PENDING, (error, rows) => {
    if (error) throw error;
    
    if (!rows.length) return;

    console.log('Resuming polling for trades [%s]...', rows.map(row => row.id).join(','));
    
    rows.forEach(row => {
        if (!tradeClassMap[row.type]) return;
        new tradeClassMap[row.type](row.id, row.user_id, row.offer_id, row.bot_id, row.bot_color);
    });
});

console.log('Trade service started');

const gracefulShutdown = _.once(() => {
    console.log('Closing deposit and withdraw queues...');

    Promise.all([depositQueue.close(), withdrawQueue.close()]).then(() => {
        console.log('Queues successfully closed');

        db.end();
        redis.quit();
        process.exit();
    }).catch(console.error);
});

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);