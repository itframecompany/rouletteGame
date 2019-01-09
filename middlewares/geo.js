const geo = require("geoip-native");
const forbidden = ["UK", "US"];

module.exports = (req, res, next) => {
    let ip = geo.lookup(req.ip);
	
	if(forbidden.indexOf(ip.code) != -1){
		
	let response = "403 Access Forbidden";
		
		return res.status(403).send(response).end();
	}

    next();
};
