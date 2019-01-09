const config = require('../../../config');
const db = require('../../../libs/db');
const balancer = require('../../../libs/balancer');

const Deposit = require('../../../models/deposit');
const DepositItem = require('../../../models/item/deposit');
const Publisher = require('../../../libs/publisher');

class Trade {
    constructor(id, userId, offerId, botId, botColor) {
        this.id = id;
        this.userId = userId;
        this.offerId = offerId;

        this.bot = {
            id: botId,
            color: botColor,
            offerID: this.offerId
        };

        this.console = {};
        ['log', 'error'].forEach(method => {
            this.console[method] = console[method].bind(console, `[Id: ${this.id}, User: ${this.userId}, OfferId: ${this.offerId}]`);
        });

        this.console.log('Trade offer created');
        
        this.publisher = new Publisher(`${config.CHANNEL_SOCKET_PREFIX}.${this.userId}`);

        this.publisher.publish('trade.new', this.bot);

        this.check();
    }

    static get state() {
        return {
            INVALID: 'invalid',
            PENDING: 'pending',
            COMPLETED: 'completed',
            COUNTER: 'counter',
            EXPIRED: 'expired',
            CANCELLED: 'cancelled',
            DECLINED: 'declined',
            OBSOLETE: 'obsolete',
            CONF_PENDING: 'conf_pending',
            CONF_DECLINED: 'conf_declined',
            CONFIRMED: 'confirmed',
            ESCROWED: 'escrowed'
        };
    }

    static create(type, user_id, offer_id, bot_id, bot_color) {
        return new Promise((resolve, reject) => {
            db.query(`insert into ${config.tables.trade} set ?`, {
                type,
                offer_id,
                user_id,
                bot_id,
                bot_color
            }, (error, result) => {
                if (error) return reject(error);
                resolve(result.insertId);
            });
        });
    }

    check() {
        this.console.log('Attempting to check...');

        balancer.check(this.bot.color, this.bot.id, this.offerId).then(response => {
            if (response.error) throw response;

            if (!response.state) throw response;

            return this.setState(response.state).then(() => {
                const state = Trade.state;

                switch (this.state) {
                    case state.COMPLETED:
                        return this.complete(response.newItems);

                    case state.EXPIRED:
                    case state.CANCELLED:
                    case state.DECLINED:
                    case state.OBSOLETE:
                    case state.CONF_DECLINED:
                        return this.cancel();

                    case state.COUNTER:
                        return this.counter();
                        break;

                    case state.ESCROWED:
                        // @todo handle
                        this.sendState();
                        break;

                    default:
                        this.continueCheck();
                        break;
                }
            });
        }).catch(err => {
            this.console.error(err);
            this.continueCheck();
        });
    }

    getTradeItems() {
        this.console.log('Getting trade items...');

        return new Promise((resolve, reject) => {
            db.query(`
                select d.id as deposit_id, d.asset_id, d.status, i.*
                from ${config.tables.deposit} d
                join ${config.tables.item} i on i.id = d.item_id
                join ${config.tables.tradeDeposit} td on td.deposit_id = d.id
                join ${config.tables.trade} t on t.id = td.trade_id
                where t.user_id = ? and t.id = ?
            `, [this.userId, this.id], (err, rows) => {
                if (err) return reject(err);
                resolve(new Deposit(rows));
            });
        });
    }
    
    counter() {
        this.console.log('Counter trade detected');
        
        return this.getTradeItems().then(deposit => {
            this.console.log('Setting items status to counter...');
            return Deposit.setStatus([...deposit.keys()], this.userId, DepositItem.status.COUNTER);
        }).then(() => {
            this.sendState();
            this.publisher.publish('trade.done');
        });
    }

    complete(items) {
        this.console.log(`Completing trade...`);
        
        return this.getTradeItems().then(deposit => {
            return this.updateStatus(deposit, items);
        }).then(() => {
            this.sendState();
            this.publisher.publish('trade.done');
        });
    }

    updateStatus(deposit, items) {
        return Promise.resolve();
    }

    cancel() {
        this.console.log('Cancelling trade...');

        return new Promise((resolve, reject) => {
            db.query(
                `update ${config.tables.deposit} set status = ? where id in (
                    select deposit_id from ${config.tables.tradeDeposit} where trade_id = ?
                )`,
                [this.constructor.cancelStatus, this.id], err => {
                    if (err) return reject(err);

                    this.sendState();

                    this.publisher.publish('trade.cancel');

                    resolve();
                }
            );
        });
    }

    continueCheck() {
        setTimeout(() => this.check(), 5000);
    }

    setState(state) {
        this.state = state;

        this.console.log(`Setting state ${state}...`);

        return new Promise((resolve, reject) => {
            db.query(`update ${config.tables.trade} set state = ? where id = ?`, [this.state, this.id], error => {
                if (error) return reject(error);
                resolve();
            });
        });
    }

    sendState() {
        this.publisher.publish('trade.state', {state: this.state});
    }
}

module.exports = Trade;
