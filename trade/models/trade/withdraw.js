const Trade = require('./');
const Deposit = require('../../../models/deposit');
const DepositItem = require('../../../models/item/deposit');

class WithdrawTrade extends Trade {
    static get cancelStatus() {
        return DepositItem.status.ACTIVE;
    }

    updateStatus(deposit) {
        const itemIds = [...deposit.values()].map(item => item.id);

        this.console.log(`Updating items [${itemIds.join(',')}] statuses...`);

        return Deposit.setStatus(itemIds, this.userId, DepositItem.status.WITHDRAWN);
    }
}

module.exports = WithdrawTrade;