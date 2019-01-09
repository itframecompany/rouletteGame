const _ = require('lodash');
const EventEmitter = require('events');

const config = require('../../config');
const db = require('../../libs/db');

const Publisher = require('../../libs/publisher');
const Deposit = require('../../models/deposit');
const Round = require('./round');
const GameError = require('./error');
const Stats = require('./../../models/stats');

class Room extends EventEmitter {
    constructor({id, key, name, time, min_bet, max_bet, max_items, max_bet_items, min_players}) {
        super();
        
        this.key = key;
        this.id = id;
        this.name = name;
		this.anim = Round.getAnim();
        
        this.initRound({time, min_bet, max_bet, max_items, max_bet_items, min_players}).then(() => {
            this.emit('init');
        }).catch(console.error);
		
		this.desc = this.describe();
    }
    
    initRound(limits) {
        this.limits = {
            time: limits.time,
            min_bet: limits.min_bet,
            max_bet: limits.max_bet || Infinity,
            max_items: limits.max_items || Infinity,
            max_bet_items: limits.max_bet_items,
            min_players: limits.min_players
        };

        return Round.create(this.id).then(round => {
            this.round = round;
            
            this.round.limits = {
                time: this.limits.time,
                min_players: this.limits.min_players
            };

            this.round.once('state.new', data => this.publish(config.CHANNEL_ROUND, 'state', data));
            this.round.once('state.start', data => this.publish(config.CHANNEL_ROUND, 'state', data));
            this.round.once('state.end', data => this.publish(config.CHANNEL_ROUND, 'state', data));
            this.round.once('state.fail', data => this.publish(config.CHANNEL_ROUND, 'state', data));

            this.round.on('bet', data => {
                this.publish(config.CHANNEL_ROUND, 'bet', data);
                this.publish(`${config.CHANNEL_SOCKET_PREFIX}.${data.bet.player.id}`, 'bet.new');
            });

            this.round.once('win', winner => {
                this.publish(`${config.CHANNEL_SOCKET_PREFIX}.${winner.id}`, 'win');
                Stats.record().then(data => {this.publish(config.CHANNEL_ROUND, 'stats', data);});
                this.emit('update');

                Round.getHistoryByRoomId(this.id).then(history => {
                    this.publish(config.CHANNEL_ROUND, 'history', {history});
                }).catch(console.error);
            });

            this.round.setState(Round.state.NEW, {
                hash: this.round.hash,
                number: this.round.number
            });
        });
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            limits: this.limits,
            round: this.round,
            state: this.round.state,
            countdownTime: this.round.countdownTime,
			desc: this.desc,
        };
    }
    
    bet(user, itemIds) {
        if (!this.round.isBetting) return Promise.reject(GameError.ROUND_ALREADY_STARTED());
        
        return Deposit.getActiveByUserId(user.id).then(deposit => {
            const items = new Map();

            for (let i = 0; i < itemIds.length; i++) {
                const id = itemIds[i];

                if (!deposit.has(id)) return Promise.reject(GameError.WRONG_USER_ITEMS());

                items.set(id, deposit.get(id));
            }

            if (!items.size) return Promise.reject(GameError.NO_BET_ITEMS());

            let totalPrice = 0;

            items.forEach(item => totalPrice += item.price);

            const player = this.round.players.get(user.id);

            if (!_.inRange(totalPrice + _.get(player, 'betSum', 0), this.limits.min_bet, this.limits.max_bet)) {
                return Promise.reject(GameError.WRONG_BET_SUM());
            }

            if (_.get(player, 'itemsCount', 0) + items.size > this.limits.max_bet_items) {
                return Promise.reject(GameError.MAX_BET_ITEMS_REACHED());
            }

            if (this.round.pot.size + items.size > this.limits.max_items) {
                return Promise.reject(GameError.MAX_ITEMS_EXCEEDED());
            }

            return this.round.bet(user, items);
        });
    }

	describe(){
		
		let desc = '';
		
		desc = desc + this.limits.min_bet + " min bet, ";
		if(this.limits.max_bet !== Infinity){
			desc = desc + this.limits.max_bet + " max bet, ";
		}
		desc = desc + this.limits.max_bet_items + " skins per player, ";
		desc = desc + this.limits.min_players + " players to start";
	
		return desc;
		
	}
	
    publish(channel, event, data = {}) {
        const publisher = new Publisher(channel);

        publisher.publish(event, Object.assign({
            room: this.key
        }, data));
    }

    quit() {
        console.log('Quitting room %s...', this.name);
        
        if (!this.round) return Promise.reject(GameError.NO_ACTIVE_ROUND());
        
        if (!this.round.isBetting) {
            console.log('Can\'t quit round %d. Already showing winner', this.round.id);
            return Promise.resolve();
        }
        
        return this.round.quit();
    }
}

module.exports = Room;