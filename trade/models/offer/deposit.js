const config = require('../../../config');
const db = require('../../../libs/db');

const Offer = require('./');
const Inventory = require('../../../models/inventory');
const InventoryCache = require('../../../models/cache/inventory');
const DepositTrade = require('../trade/deposit');
const balancer = require('../../../libs/balancer');

class DepositOffer extends Offer {
    static get type() {
        return 'deposit';
    }
    
    request() {
        this.console.log(`Sending request to balancer with assets: [${this.ids.join(',')}]...`);
        return balancer.deposit(this.user.steamId, this.user.token, this.ids);
    }
    
    processOffer(response) {
        return super.processOffer(response).then(tradeId => {
            this.console.log(`Trade successfully created with id ${tradeId}`);

            const cache = new InventoryCache(this.user.steamId);

            this.console.log('Getting inventory from cache...');
            
            return cache.get().then(inventory => {
                if (inventory.size) return inventory;

                this.console.log('No inventory items found in cache. Getting from steam...');

                return Inventory.getBySteamId(this.user.steamId).then(inventory => {
                    this.console.log('Putting inventory items into cache...');

                    cache.put([...inventory.values()]);

                    return inventory;
                });
            }).then(inventory => {
                const items = this.ids.map(id => inventory.get(id));
                return this.addDeposit(items, tradeId);
            }).then(() => {
                new DepositTrade(tradeId, this.user.id, response.offerID, response.botID, response.color);
            });
        });
    }

    addDeposit(items, tradeId) {
        this.console.log('Adding items to deposit table...');

        return new Promise((resolve, reject) => {
            const values = items.map(item => [item.itemId, item.assetId, this.user.id]);

            db.query(`insert into ${config.tables.deposit} (item_id, asset_id, user_id) values ?`, [values], (error, result) => {
                if (error) return reject(error);

                const depositIds = [];

                for (let i = result.insertId; i < result.insertId + result.affectedRows; i++) {
                    depositIds.push(i);
                }
                
                resolve(this.addTradeDeposit(tradeId, depositIds));
            });
        });
    }
}

module.exports = DepositOffer;