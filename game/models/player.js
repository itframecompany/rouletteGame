const _ = require('lodash');

const User = require('../../models/user');
const Deposit = require('../../models/deposit');
const DepositItem = require('../../models/item/deposit');

class Player extends User {
    constructor(user) {
        super(user);

        this.chance = 0;
        this.betSum = 0;
        this.itemsCount = 0;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            avatar: this.avatar,
            chance: _.round(this.chance, 2),
            itemsCount: this.itemsCount,
            betSum: _.round(this.betSum, 2)
        };
    }
    
    bet(items) {
        items.forEach(item => this.betSum += item.price);

        this.itemsCount += items.size;
        
        return Deposit.setStatus([...items.keys()], this.id, DepositItem.status.BET);
    }
}

module.exports = Player;
