const db = require('../libs/db');
const config = require('../config');

const GameError = require('../game/models/error');
const DepositItem = require('./item/deposit');

class Deposit extends Map {
    constructor(items) {
        super();

        items.forEach(props => {
            const item = new DepositItem(props);
            this.set(item.id, item);
        });
    }

    toJSON() {
        const items = {};

        this.forEach((item, id) => {
            if (!item.isVisible) return;
            items[id] = item;
        });

        return items;
    }

    static getByUserId(userId, status = DepositItem.allStatuses) {
        return new Promise((resolve, reject) => {
            db.query(`
                select d.id as deposit_id, d.asset_id, d.status, i.*
                from ${config.tables.deposit} d
                join ${config.tables.item} i on i.id = d.item_id
                where d.user_id = ? and d.status in (?)
            `, [userId, status], (error, rows) => {
                if (error) return reject(error);
                resolve(new this(rows));
            });
        });
    }
    
    static getActiveByUserId(userId) {
        return this.getByUserId(userId, [DepositItem.status.ACTIVE]);
    }
    
    static addWinning(userId, items) {
        return new Promise((resolve, reject) => {
            const values = items.map(item => [item.id, item.itemId, item.assetId, userId, DepositItem.status.ACTIVE]);
    
            db.query(
                `insert into ${config.tables.deposit} (id, item_id, asset_id, user_id, status) values ?
                on duplicate key update user_id = values(user_id), status = values(status)`,
                [values], error => {
                    if (error) return reject(error);
                    resolve();
                }
            );
        });
    }

    static setStatus(itemIds, userId, status) {
        return new Promise((resolve, reject) => {
            // @todo How to check that items belong to user?
            db.query(`select count(*) as count from ${config.tables.deposit} where user_id = ? and id in (?)`, [userId, itemIds], (error, rows) => {
                if (error) return reject(error);

                if (itemIds.length !== rows[0].count) return reject(GameError.WRONG_USER_ITEMS());

                db.query(`update ${config.tables.deposit} set status = ? where user_id = ? and id in (?)`, [status, userId, itemIds], error => {
                    if (error) return reject(error);
                    resolve();
                });
            });
        });
    }
    
    static getCountByUserId(userId) {
        const status = DepositItem.status;
        
        return new Promise((resolve, reject) => {
            db.query(
                `select count(*) as count from ${config.tables.deposit} where user_id = ? and status in (?)`,
                [userId, [status.DEPOSIT_PENDING, status.ACTIVE, status.BET, status.WITHDRAW_PENDING]],
                (error, rows) => {
                    if (error) return reject(error);
                    resolve(rows[0].count);
                }
            );
        });
    }
}

module.exports = Deposit;