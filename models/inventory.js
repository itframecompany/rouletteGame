const _ = require('lodash');

const config = require('../config');
const db = require('../libs/db');

const balancer = require('../libs/balancer');

const InventoryItem = require('./item/inventory');

class Inventory extends Map {
    constructor(items) {
        super();

        if (!Array.isArray(items)) return;

        items.forEach(props => {
            const item = new InventoryItem(props);
            this.set(item.assetId, item);
        });
        
    }
    
    static getBySteamId(steamId) {
        return balancer.inventory(steamId).then(items => {
            const names = items.map(item => item.name);

            return this.getItemsByNames(names).then(itemsByNames => {
                items = items.filter(item => itemsByNames[item.name]).map(item => Object.assign({}, item, itemsByNames[item.name]));
                return new this(items);
            });
        });
    }

    static getItemsByNames(names) {
        return new Promise((resolve, reject) => {
            db.query(`select * from ${config.tables.item} where name in (?)`, [names], (error, rows) => {
                if (error) return reject(error);
                resolve(_.keyBy(rows, 'name'));
            });
        });
    }
}

module.exports = Inventory;
