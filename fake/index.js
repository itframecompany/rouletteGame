const _ = require('lodash');

const observer = require('../libs/observer');

const game = require('../game');
const User = require('../models/user');
const Deposit = require('../models/deposit');

class Fake {
    constructor() {
        console.log('Fake module initialized');

        const ids = ['346346543634646'];

        Promise.all(ids.map(steamId => User.findBySteamId(steamId))).then(users => {
            users.forEach(user => {
                setInterval(() => {
                    Deposit.getActiveByUserId(user.id).then(deposit => {
                        const room = _.sample([...game.rooms]);
                        const itemIds = _.sampleSize([...deposit.keys()], _.random(1, 3));
                        observer.emit(`${room.id}.bet`, user, itemIds);
                    });
                }, _.random(5000, 13000));
            });
        }).catch(console.error);
    }
}

module.exports = new Fake();
