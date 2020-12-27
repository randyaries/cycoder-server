const { createServer } = require('../dist/index');
const port = 3000;
const host = 'localhost';

createServer({
    app: {
        id: '6e868125-dfe0-4e70-b476-9391e1ec1748',
        secret: 'abcdefghijklmnopqrstuvwxyzdadaaa'
    },
    socketio: {
        cors: {
            origin: '*'
        }
    },
    subscribers: {
        http: true,
        redis: false,
        nats: false,
    }
}).listen(port);
