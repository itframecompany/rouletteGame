const _ = require('lodash');

const config = require('../../config');

const Deposit = require('./../../models/deposit');
const db = require('./../../libs/db');
const util = require('util');

//const threshold = 1.8;

class Rake {
    constructor(id, chance, items, bank) {
        this.chance = chance;
		this.id = id;
		
        let rakeItemId;
        let rakeItems = [],
		rakeItemPrice = 0,
		rakeItemSum = ((this.percent * bank) / 100).toFixed(2),
		rakeValue = rakeItemSum;
		console.log("Bank: " + bank + ", percent: " +this.percent+ ", rake: " + rakeValue)
		
		let pot = Array.from(items.values());
		
		pot.sort((a,b) => {
			
			return b.price - a.price;
			
		});
		
		for(let i = 0; i < pot.length; i++){
			if (pot[i].price / bank * 100 > this.percent) continue;
			if (pot[i].price > rakeItemSum) continue;

			console.log("Raking in item: " + pot[i].name + " priced at " + pot[i].price)
			rakeItems.push(items.get(pot[i].id));	
			rakeItemSum = rakeItemSum - pot[i].price;
			console.log("Rake residue: " + rakeItemSum)
			items.delete(pot[i].id);
			
			if (rakeItemSum < 0.25) break;
		}
		
		if(rakeItems.length > 0){
			
			Deposit.addWinning(config.APP_PLAYER_ID, rakeItems).catch(console.error);
			let pure = rakeValue - rakeItemSum;
			this.record(this.id, pure, rakeValue);
			console.log("Pure rake: " + pure);
			
		} else {
			
			this.record(this.id, 0, rakeValue);
			
		}
		

    }

	record(round_id, real_sum, ideal_sum)
	{
		
		return new Promise((resolve,reject) => {
			
			db.query('insert into rake (round_id, ideal_sum, real_sum) values(?,?,?)',[round_id,ideal_sum,real_sum],(err, result) => {
				
				if(err) return reject(err);
				return resolve(1);
				
			});
			
		});
		
	}
	
    get percent() {
        if (_.inRange(this.chance, 0, 50)) return 10;
        else if (_.inRange(this.chance, 50, 60)) return 8;
        else if (_.inRange(this.chance, 60, 70)) return 7;
        else if (_.inRange(this.chance, 70, 80)) return 6;
        else if (_.inRange(this.chance, 80, 90)) return 5;
        else if (_.inRange(this.chance, 90, 95)) return 3;
        else return 0;
    }
}

module.exports = Rake;