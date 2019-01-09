const _ = require('lodash');
const errors = require('request-promise/errors');
const EventEmitter = require('events');

const config = require('../../../config');
const db = require('../../../libs/db');

const Publisher = require('../../../libs/publisher');
const SecretCache = require('../../../models/cache/secret');
const TradeError = require('../error');
const Trade = require('../trade');
const balancer = require('../../../libs/balancer');

class Offer extends EventEmitter {
    constructor(user, ids) {
        super();
        
        this.user = user;

        this.ids = ids;
        
        this.publisher = new Publisher(`${config.CHANNEL_SOCKET_PREFIX}.${this.user.id}`);

        this.console = {};
        ['log', 'error'].forEach(method => {
            this.console[method] = console[method].bind(console, `[${this.user.name} ${this.constructor.type} ${this.ids.join(',')}]`);
        });

        this.console.log('Creating trade offer...');
        
        this.request().then(response => {
            this.console.log('Got response from balancer', response);
            return this.process(response);
        }).catch(reason => {
            let error = reason;
            
            if (reason instanceof errors.RequestError) {
                this.console.log('Request to balancer failed with RequestError', reason);
                error = TradeError.INTERNAL();
            }
            
            if (reason instanceof errors.StatusCodeError) {
                this.console.log('Request to balancer failed with StatusCodeError', reason);
                error = _.get(reason, ['response', 'body'], TradeError.INTERNAL());
            }

            this.publishError(new TradeError(error.error, error.code, error.level));
        }).then(() => {
            this.emit('done');
        });
    }

    request() {
        return Promise.reject(TradeError.WRONG_REQUEST_HANDLER());
    }
    
    process(response) {
        return this.processOffer(response);
    }

    processOffer(data) {
        if (data.error) return Promise.reject(data.error);

        this.console.log(`Processing offer ${data.offerID}...`);

        const cache = new SecretCache(this.user.id, data.secret);

        this.console.log(`Putting secret token ${data.secret} into cache...`);

        cache.put(data.offerID);

        this.console.log('Inserting trade into database...');

        return Trade.create(this.constructor.type, this.user.id, data.offerID, data.botID, data.color);
    }

    publishError(err) {
        this.console.error(err);

        if ([5, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 61].includes(err.code)) {
            this.publisher.publish('error', err);
        }
    }

    addTradeDeposit(tradeId, depositIds) {
        this.console.log(`Adding items [${depositIds.join(',')}] to trade_deposit table with tradeId ${tradeId}...`);

        return new Promise((resolve, reject) => {
            const values = depositIds.map(id => [tradeId, id]);

            db.query(`insert into ${config.tables.tradeDeposit} (trade_id, deposit_id) values ?`, [values], error => {
                if (error) return reject(error);
                resolve();
            });
        });
    }
}

module.exports = Offer;