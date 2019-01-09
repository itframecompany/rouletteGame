const config = require('../../../config');
const db = require('../../../libs/db');

const Offer = require('./');
const TradeError = require('../error');
const WithdrawTrade = require('../trade/withdraw');
const Deposit = require('../../../models/deposit');
const DepositItem = require('../../../models/item/deposit');
const balancer = require('../../../libs/balancer');

class WithdrawOffer extends Offer {
    static get type() {
        return 'withdraw';
    }

    request() {
        this.console.log('Setting withdraw_pending status...');

        return Deposit.setStatus(this.ids, this.user.id, DepositItem.status.WITHDRAW_PENDING).then(() => {
            this.console.log('Status successfully set');

            this.publisher.publish('trade.withdraw');

            return this.getTradeItems().then(tradeItems => {
                this.tradeItems = tradeItems;

                const assets = this.tradeItems.map(item => {
                    return {
                        assetID: item.assetId,
                        botID: item.bot.id,
                        color: item.bot.color
                    };
                });

                this.console.log(`Sending request to balancer with assets: [${assets.map(asset => asset.assetID).join(',')}]...`);

                return balancer.withdraw(this.user.steamId, this.user.token, assets);
            });
        }).catch(err => {
            this.publisher.publish('trade.fail', this.ids);
            return Promise.reject(err);
        });
    }
    
    process(response) {
        response.forEach(data => this.processOffer(data));
    }
    
    processOffer(data) {
        this.console.log(`Trying to filter trade items for offer ${data.offerID}...`);

        const itemIds = this.tradeItems.filter(item => {
            return item.bot.id === data.botID && item.bot.color === data.color;
        }).map(item => item.id);
        
        return super.processOffer(data).then(tradeId => {
            return this.addTradeDeposit(tradeId, itemIds).then(() => {
                new WithdrawTrade(tradeId, this.user.id, data.offerID, data.botID, data.color);
            });
        }).catch(err => {
            if (err === 'ECONNREFUSED') {
                err = new TradeError('', 23, TradeError.level.YELLOW);
            }
            
            this.publisher.publish('trade.fail', itemIds);
            
            this.publishError(err);
        });
    }
    
    getTradeItems() {
        this.console.log('Getting deposit items for trade...');

        return new Promise((resolve, reject) => {
            db.query(
                `select d.id as deposit_id, d.asset_id, d.status, t.bot_id, t.bot_color, i.*
                from ${config.tables.deposit} d
                join ${config.tables.item} i on i.id = d.item_id
                join ${config.tables.tradeDeposit} td on td.deposit_id = d.id
                join ${config.tables.trade} t on t.id = td.trade_id
                where d.id in (?) and d.user_id = ? and d.status = ? and t.type = 'deposit'`,
                [this.ids, this.user.id, DepositItem.status.WITHDRAW_PENDING],
                (err, rows) => {
                    if (err) return reject(err);

                    if (this.ids.length !== rows.length) return reject(TradeError.BAD_WITHDRAW());
                    
                    resolve(rows.map(row => {
                        const depositItem = new DepositItem(row);

                        depositItem.bot = {
                            id: row.bot_id,
                            color: row.bot_color
                        };

                        return depositItem;
                    }));
                }
            );
        });
    }
}

module.exports = WithdrawOffer;