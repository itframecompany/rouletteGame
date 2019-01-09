const User = require('../models/user');
const Stats = require('../models/stats');
const bodyParser = require('body-parser');
const util = require('util');
const path = require('path');

const router = module.exports = require('express').Router();

const allowed = [	'76561198268400490', // A
					'76561197987687225', // 3
					'76561198074920193', // M
					'76561198054054903', // B
					'76561198037462093', // B0ndz0r
					];

router.use(bodyParser.json());

function admin(req,res){
	
	let steamid = (req.user) ? req.user.steamId : '';
	
	if(allowed.indexOf(steamid) != -1){
	
	Stats.recordAdminGeneral().then((result, error) => {
		
		if(error){
			
			console.log('Admin stats error: ' + util.inspect(error));
			res.status(500).end();
			
		}
		
		console.log(util.inspect(result));
		
		res.render(path.join(__dirname, '../admin', 'index.pug'), {		
				totalPlayers_alltime:result.totalPlayers_alltime,
				totalPlayers_today:result.totalPlayers_today,
				totalPlayers_yesterday:result.totalPlayers_yesterday,		
				newPlayers_today:result.newPlayers_today,
				newPlayers_yesterday:result.newPlayers_yesterday,	
				newSignups_today:result.newSignups_today,
				newSignups_yesterday:result.newSignups_yesterday,			
				games_today:result.games_today,
				games_yesterday:result.games_yesterday,
				bankTotal_today:result.bankTotal_today,
				bankTotal_yesterday:result.bankTotal_yesterday,			
				bankAvg_today:result.bankAvg_today,
				bankAvg_yesterday:result.bankAvg_yesterday,		
				rakeReal_today:result.rakeReal_today,
				rakeReal_yesterday:result.rakeReal_yesterday,			
				rakeIdeal_today:result.rakeIdeal_today,
				rakeIdeal_yesterday:result.rakeIdeal_yesterday,	
				botItemsNum:result.botItemsNum,
				botItemsSum:result.botItemsSum,
				games_alltime:result.games_alltime,
				rakeReal_alltime:result.rakeReal_alltime
			});
		
	});
	
	} else {
		
		res.status(500).send('You shall not pass!');
		
	}
	
}

router.get('/msdmn/', admin);
router.get('/msdmn/*', admin);

