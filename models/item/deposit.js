const InventoryItem = require('./inventory');

class DepositItem extends InventoryItem {
    constructor({
        deposit_id,
        status = DepositItem.status.DEPOSIT_PENDING,
        asset_id,
        id,
        name,
        price,
        color,
        name_color,
        icon_url,
        icon_url_large
    }) {
        super({asset_id, id, name, price, color, name_color, icon_url, icon_url_large});
        
        this.id = deposit_id;
        this.status = status;
    }
    
    get isVisible() {
        const status = DepositItem.status;
        return [status.DEPOSIT_PENDING, status.ACTIVE, status.WITHDRAW_PENDING].includes(this.status);
    }
    
    get isActive() {
        return this.status === DepositItem.status.ACTIVE;
    }
    
    static get status() {
        return {
            DEPOSIT_PENDING: 'deposit_pending',
            DEPOSIT_FAILURE: 'deposit_failure',
            ACTIVE: 'active',
            BET: 'bet',
            INACTIVE: 'inactive',
            WITHDRAW_PENDING: 'withdraw_pending',
            WITHDRAWN: 'withdrawn',
            COUNTER: 'counter'
        };
    }
    
    static get allStatuses() {
        return Object.keys(this.status).map(id => this.status[id]);
    }
}

module.exports = DepositItem;