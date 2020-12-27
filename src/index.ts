import { Channel, ChannelInterface } from './channels';
import { Log } from './log';
import { Options, Server } from './server';
import { HttpSubscriber, NatsSubscriber, RedisSubscriber, Subscriber } from './subscribers';
import { Namespace, Socket } from 'socket.io';

export class Ecosystem {
    /**
     * Default configuration
     */
    private defaultOptions: Options = {
        app: {
            id: '',
            secret: ''
        },
        dev: true,
        subscribers: {
            http: true,
            redis: true,
            nats: true,
        },
        socketio: {},
        server: {},
        redis: {
            options: {
                host: '0.0.0.0',
                port: 6379
            }
        }
    };

    private server: Server;

    private clients: Socket[] = [];

    private subscribers: Subscriber[];

    private nsps: { name: any, socket?: Namespace, clients: Socket[] }[] = [];

    public constructor(private options: any = {}) {
        this.options = Object.assign(this.defaultOptions, this.options);

        this.startup();

        this.server = new Server(this.options);
    }

    public channel(channel: ChannelInterface | Function): this {
        this.options.channel = channel;

        return this;
    }

    public of(name: any): this {
        if (typeof name === 'string' && !name.startsWith('/')) {
            name = `/${name}`;
        }

        this.nsps.push({ name, clients: [] });

        return this;
    }

    public listen(...args: any): Promise<{io: any, http: any}> {
        return new Promise((resolve, reject) => {
            this.server.init().then((timer) => {
                setTimeout(() => {
                    this.server.app.listen(...args);

                    timer && clearInterval(timer);
                    this.init();

                    resolve({
                        io: Object.assign(this.server.io, { nsps: this.nsps }),
                        http: this.server.app
                    });

                    Log.info('\n');
                    Log.removeUp(2);
                    Log.info('Server ready!\n');
                }, 3500);
            }).catch(error => reject(error));
        });
    }

    private init(): Promise<any> {
        this.buildChannel();

        return new Promise((resolve, reject) => {
            this.subscribers = [];
            if (this.options.subscribers.http)
                this.subscribers.push(new HttpSubscriber(this.server.app, this.options));
            if (this.options.subscribers.redis)
                this.subscribers.push(new RedisSubscriber(this.server.redis, this.options));
            if (this.options.subscribers.nats)
                this.subscribers.push(new NatsSubscriber(this.server.nats, this.options));

            this.onConnect();
            this.run().then(resolve, reject);
        });
    }

    private startup(): void {
        Log.title('\nE C O S Y S T E M  S O C K E T  S E R V E R\n\n');

        if (this.options.dev) {
            Log.warning('Starting server in DEV mode\n');
        } else {
            Log.info('Starting server\n');
        }
    }

    private run(): Promise<any> {
        return new Promise((resolve, reject) => {
            Promise.all(this.subscribers.map((subscriber, index) => {
                return subscriber.subscribe((channel: string, message: any, name?: string) => {
                    this.broadcast(channel, message, name);
                });
            })).then(resolve, reject);
        });
    }

    private broadcast(channel: string, message: any, name?: string): void {
        const socket = this.findSocketById(message.socket, name);
        if (socket) {
            this.others(socket, channel, message);
        } else {
            message.socket = undefined;
            this.all(channel, message, name);
        }
    }

    private findSocketById(id: string, name?: string): Socket {
        const nsp = this.findNspByName(name);
        if (!!nsp) {
            return nsp.clients.find((val: any) => val.id === id);
        }

        return this.clients.find((val: any) => val.id === id);
    }

    private findNspByName(name: any): any {
        const nsp = this.nsps.find((val: any) => new RegExp(val.name).test(name));

        return nsp ?? null;
    }

    private others(socket: Socket, channel: string, message: any): void {
        message = this.parser(message);
        socket.broadcast.to(channel).emit(message.event, channel, message.data);
    }

    private all(channel: string, message: any, name?: any): void {
        const nsp = this.findNspByName(name);
        const socket = !!nsp ? nsp.socket : this.server.io;

        message = this.parser(message);
        socket.to(channel).emit(message.event, channel, message.data);
    }

    private parser(message: any): any {
        const event = message.event;
        delete message.event;

        message = typeof message.data === 'object'
            ? Object.assign({ socket: message.socket }, message.data) : message;
        
        return { event, data: message };
    }

    /**
     * On server connection.
     * 
     * @return {void}
     */
    protected onConnect(): void {
        this.nsps.forEach((value, index) => {
            this.nsps[index].socket = this.server.io.of(
                value.name,
                (socket) => {
                    this.nsps[index].clients.push(socket);

                    this.onSubscribe(socket);
                    this.onUnsubscribe(socket);
                    this.onDisconnecting(socket, false, index);
                }
            ).use((req, next) => this.server.authorizeRequests(req.handshake, next));
        });

        this.server.io.on('connection', async (socket: Socket) => {
            this.clients.push(socket);

            this.onSubscribe(socket);
            this.onUnsubscribe(socket);
            this.onDisconnecting(socket);
        });
    }

    /**
     * On subscribe to a channel.
     * 
     * @param {any} socket
     * @return {void}
     */
    private onSubscribe(socket: any): void {
        socket.on('subscribe', (data: any) => {
            this.options.channel.join(socket, data);
        });
    }

    /**
     * On unsubscribe from a channel.
     * 
     * @param {any} socket
     * @return {void}
     */
    private onUnsubscribe(socket: any): void {
        socket.on('unsubscribe', (data: any) => {
            this.options.channel.leave(socket, data.channel, 'unsubscribed');
        });
    }

    /**
     * On socket disconnecting.
     * 
     * @param {any} socket
     * @return {void}
     */
    private onDisconnecting(socket: Socket, nsp?: boolean, index?: any): void {
        socket.on('disconnect', (reason: any) => {
            if (!nsp) {
                this.clients = this.clients.filter(v => v.id !== socket.id);
            } else {
                this.nsps[index].clients =
                    this.nsps[index].clients.filter(v => v.id === socket.id);
            }

            this.options.channel.leave(socket, socket.id, `${socket.nsp.name} - ${reason}`);
        });
    }

    private buildChannel(): void {        
        if (this.options.channel === undefined) {
            this.options.channel = new Channel();
        } else {
            this.options.channel = typeof this.options.channel === 'function'
                ? this.options.channel(this.server.io) : this.options.channel;

            if (typeof this.options.channel !== 'object') {
                this.options.channel = undefined;
            } else {
                if (
                    !this.options.channel.join &&
                    !this.options.channel.leave
                ) {
                    this.options.channel = undefined;
                }
            }
        }
    }
}

export function createServer(opts?: Partial<Options>): Ecosystem {
    return new Ecosystem(opts);
}
