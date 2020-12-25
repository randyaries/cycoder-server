const { createServer } = require('../dist/index');
const request = require('request');
const url = require('url');
const port = 3002;
const host = 'localhost';

const authHost = 'http://localhost:8000';
const authEndpoint = '/broadcasting/auth';

class Channel {
    private;

    presence;

    constructor (io) {
        this.io = io;
        this.private = new PrivateChannel(options);
        this.presence = new PresenceChannel(io, options);
    }

    join (socket, data) {
        if (data.channel) {
            if (this.isPrivate(data.channel)) {
                this.joinPrivate(socket, data);
            } else {
                socket.join(data.channel);
                this.onJoin(socket, data.channel);
            }
        }
    }

    leave (socket, channel, reason) {
        if (channel) {
            if (this.isPresence(channel)) {
                this.presence.leave(socket, channel)
            }

            socket.leave(channel);

            console.log(`[${new Date().toISOString()}] - ${socket.id} left channel: ${channel} (${reason})`);
        }
    }

    isPrivate(channel) {
        let isPrivate = false;

        ['private-*', 'presence-*'].forEach(privateChannel => {
            const regex = new RegExp(privateChannel.replace('\*', '.*'));
            if (regex.test(channel)) isPrivate = true;
        });

        return isPrivate;
    }

    joinPrivate(socket, data) {
        this.private.authenticate(socket, data).then(res => {
            socket.join(data.channel);

            if (this.isPresence(data.channel)) {
                let member = res.channel_data;
                try {
                    member = JSON.parse(res.channel_data);
                } catch (e) { }

                this.presence.join(socket, data.channel, member);
            }

            this.onJoin(socket, data.channel);
        }, error => {
            console.error(error.reason);

            this.io.sockets.to(socket.id)
                .emit('subscription_error', data.channel, error.status);
        });
    }

    isPresence(channel) {
        return channel.lastIndexOf('presence-', 0) === 0;
    }

    onJoin(socket, channel) {
        console.log(`[${new Date().toISOString()}] - ${socket.id} joined channel: ${channel}`);
    }
}

class PrivateChannel {
    constructor () {
        this.request = request;
    }

    authenticate(socket, data) {
        const options = {
            url: this.authHost(socket) + authEndpoint,
            form: { channel_name: data.channel },
            headers: (data.auth && data.auth.headers) ? data.auth.headers : {},
            rejectUnauthorized: false
        };

        console.log(`[${new Date().toISOString()}] - Sending auth request to: ${options.url}\n`);

        return this.serverRequest(socket, options);
    }

    authHost(socket) {
        let authHosts = authHost;

        if (typeof authHosts === "string") {
            authHosts = [authHosts];
        }

        let authHostSelected = authHosts[0] || 'http://localhost';

        if (socket.request.headers.referer) {
            let referer = url.parse(socket.request.headers.referer);

            for (let authHost of authHosts) {
                authHostSelected = authHost;

                if (this.hasMatchingHost(referer, authHost)) {
                    authHostSelected = `${referer.protocol}//${referer.host}`;
                    break;
                }
            };
        }

        console.log(`[${new Date().toISOString()}] - Preparing authentication request to: ${authHostSelected}`);

        return authHostSelected;
    }

    hasMatchingHost(referer, host) {
        return (referer.hostname && referer.hostname.substr(referer.hostname.indexOf('.')) === host) ||
            `${referer.protocol}//${referer.host}` === host ||
            referer.host === host;
    }

    serverRequest(socket, options) {
        return new Promise((resolve, reject) => {
            let body;

            this.request.post(options, (error, response, body, next) => {
                if (error) {
                    console.error(`[${new Date().toISOString()}] - Error authenticating ${socket.id} for ${options.form.channel_name}`);
                    console.error(error);

                    reject({ reason: 'Error sending authentication request.', status: 0 });
                } else if (response.statusCode !== 200) {
                    console.warn(`[${new Date().toISOString()}] - ${socket.id} could not be authenticated to ${options.form.channel_name}`);
                    console.error(response.body);

                    reject({ reason: 'Client can not be authenticated, got HTTP status ' + response.statusCode, status: response.statusCode });
                } else {
                    console.log(`[${new Date().toISOString()}] - ${socket.id} authenticated for: ${options.form.channel_name}`);

                    try {
                        body = JSON.parse(response.body);
                    } catch (e) {
                        body = response.body
                    }

                    resolve(body);
                }
            });
        });
    }
}

class PresenceChannel {
    constructor (io, options) {

    }
}

const server = createServer({
    app: {
        id: '6e868125-dfe0-4e70-b476-9391e1ec1748',
        secret: 'abcdefghijklmnopqrstuvwxyzdadaaa'
    },
    socketio: {
        cors: {
            origin: '*'
        }
    }
});

server.channel((io, options) => {
    return new Channel(io, options);
});

server.listen(port, host, () => {
    console.log(`Listening to serve http://${host}:${port}`);
});
