const http = require('http');
const express = require('express');
const log4js = require('log4js');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const startSocketServer = require('./ws/server');
const port = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
var path = require('path');
//Return the directries:


app.set('views', process.env.DIR_VIEWS);
app.set('view engine', 'pug');
app.set('trust proxy', 1);
app.use(cookieParser());
app.get('/',function(req,res){
  console.log('dirna,e',__dirname)
    res.sendFile(path.join(__dirname+'/views/src/index.html'));
    //__dirname : It will resolve to your project folder.
  });

app.disable('x-powered-by');

log4js.replaceConsole();

app.use(log4js.connectLogger(log4js.getLogger('http')));
app.use(require('./routes'));
server.listen(port, () => console.info(`HTTPS server listening on port   ${port}`));
app.use(express.static('public'));


startSocketServer(server);