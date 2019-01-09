const config = require('../../../config');
const db = require('../../../libs/db');

const Trade = require('./');
const DepositItem = require('../../../models/item/deposit');

class DepositTrade extends Trade {
    static get cancelStatus() {
        return DepositItem.status.DEPOSIT_FAILURE;
    }

    complete(items) {
        this.console.log(`Trying to complete deposit trade...`);

        if (!items) {
            this.continueCheck();
            return;
        }

        this.console.log(`New items [${items.map(item => item.id).join(',')}]`);

        return super.complete(items);
    }

    updateStatus(deposit, items) {
        const self = this;
        
        function update(item) {
            self.console.log(`Updating item ${item.market_hash_name} status...`);

            return new Promise((resolve, reject) => {
                const depositItem = [...deposit.values()].find(i => i.name === item.market_hash_name);

                deposit.delete(depositItem.id);

                self.console.log(`Found item ${depositItem.id} to update status`);

                db.query(
                    `update ${config.tables.deposit} set status = ?, asset_id = ? where id = ?`,
                    [DepositItem.status.ACTIVE, item.id, depositItem.id],
                    err => {
                        if (err) return reject(err);
                        resolve();
                    }
                );
            });
        }
        
        return Promise.all(items.map(update));
    }
}

module.exports = DepositTrade;