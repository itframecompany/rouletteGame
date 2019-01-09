class MyError extends Error {
    constructor(message, code, level) {
        super(message);

        this.name = this.constructor.name;
        
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = (new Error(message)).stack;
        }

        this.code = code;
        this.level = level;
    }

    toJSON() {
        return {
            code: this.code,
            level: this.level
        };
    }

    static INTERNAL(message = 'Internal error') {
        return new this(message, 1000, this.level.RED);
    }

    static get level() {
        return {
            GREEN: 'green',
            YELLOW: 'yellow',
            RED: 'red'
        };
    }
}

module.exports = MyError;