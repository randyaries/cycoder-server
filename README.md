## System Requirements

The following are required to function properly.

* Node 10.0+
* Redis 4.0+
* Nats 2.0+

## The system used

* Fastify 3.9+ see: [https://www.fastify.io/docs/latest/](https://www.fastify.io/docs/latest/)
* Socket IO 3.0+ see: [https://socket.io/docs/v3/server-api/index.html](https://socket.io/docs/v3/server-api/index.html)

## Installation

```shell
$ npm install cycoder-server
```

## How to use

The following example attaches socket.io to a plain Node.JS HTTP server listening on port 3000

Simply code:

```js
const ecosystem = require('cycoder-server').createServer({
    app: {
        id: '...', // set with uuid v4
        secret: '...'
    }
});

ecosystem.listen(3000);
```

## Custom channel

Simply code:

```js
ecosystem.channel({
    join: (socket, channel) => {},
    leave: (socket, channel, reason) => {}
});
```

## How to server SocketIO and HTTP

Simply code:

```js
echosystem.listen(3000).then(({ io, http }) => {
    // Code here
});
```

Or

```js
const { io, http } = echosystem.listen(3000);
```

## Multiple namespaces

Simply code:

```js
ecosystem.of(/^\/dynamic-\d+$/)
```

Or

```js
ecosystem.of('/dynamic-101')
```
