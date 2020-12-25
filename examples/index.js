const { createServer } = require('../dist/index');
const port = 3002;
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
})
.of(/^\/dynamic-\d+$/)
.listen(port, host, () => {
    console.log(`Listening to serve http://${host}:${port}\n`);
}).then(({ io, http }) => {
    http.get('/', (req, res) => {
        res.send({ message: 'Hello world!' });
    });
});
