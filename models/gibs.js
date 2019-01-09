const EventEmitter = require('events');

const db = require('../libs/db');

class gibs extends EventEmitter {

    static getWidget() {

        //promise because there will be a DB query!

        return new Promise((resolve, reject) => {

            let widget = '<a class="e-widget no-button" href="https://gleam.io/UzgSD/get-your-skins" rel="nofollow">Get Your Skins</a><script type="text/javascript" src="https://js.gleam.io/e.js" async="true"></script>';
            return resolve({html: widget});

        });

    }

}

module.exports = gibs;
