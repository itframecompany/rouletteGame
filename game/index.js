const _ = require('lodash');
const Queue = require('bull');

require('log4js').replaceConsole();

const db = require('../libs/db');
const redis = require('../libs/redis').client;
const config = require('../config');

const Publisher = require('../libs/publisher');
const GameError = require('./models/error');

const game = require('./models/game');

const infoQueue = Queue('info');
const betQueue = Queue('bet');

game.on('init', () => {
    infoQueue.process(1000, (job, done) => {
        const publisher = new Publisher(`${config.CHANNEL_SOCKET_PREFIX}.${job.data.id}`);

        publisher.publish('game.info', game);

        done();
    });

    betQueue.process(job => {
        if (!game.rooms.has(job.data.room)) return Promise.reject(GameError.WRONG_ROOM());

        if (!Array.isArray(job.data.itemIds)) return Promise.reject(GameError.BAD_ITEMS());

        return game.rooms.get(job.data.room).bet(job.data.user, job.data.itemIds);
    });
});

betQueue.on('failed', (job, error) => {
    const publisher = new Publisher(`${config.CHANNEL_SOCKET_PREFIX}.${job.data.id}`);
    publisher.publish('error', error);
});

game.on('error', console.error);

const gracefulShutdown = _.once(() => {
    console.log('Shutdown started...');
    
    Promise.all([infoQueue.close(), betQueue.close()])
        .then(() => {
            console.log('Job queues closed');
            return game.quit();
        })
        .then(() => {
            console.log('Game successfully ended');
            
            db.end();
            redis.quit();
            process.exit();
        }).catch(console.error);
});

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);