import fastify, { FastifyServerOptions } from 'fastify';
import io, { Server as IoServer } from 'socket.io';
import { Log } from './log';
import { SecureContextOptions } from 'tls';
import { validate, version } from 'uuid';
import { ChannelInterface } from './channels';
import { CorsOptions } from 'cors';
import { RedisClient } from 'redis';
import { Client, connect, NatsConnectionOptions } from 'ts-nats';

interface AppServer {
    id: string;
    secret: string;
}

interface ServerOptions extends FastifyServerOptions {
    cors?: CorsOptions
}

interface NatsOptions extends NatsConnectionOptions {
    prefix?: string
}

export interface Options {
    app: AppServer;
    dev: boolean,
    channel?: ChannelInterface,
    subscribers: {
        http: boolean,
        redis: boolean,
        nats: boolean,
    },
    socketio: Partial<io.ServerOptions>, // SocketIO
    ssl?: SecureContextOptions, // HTTP Secure SSL
    server: ServerOptions, // Configuration (HTTP|HTTPS|HTTP/2)
    redis: {
        client?: any,
        options?: any,
        prefix?: string
    },
    nats?: NatsOptions
}

export class Server {
    public app: any;

    public io: io.Server;

    public redis: RedisClient;

    public nats: Client;

    public sockets: any = {};

    public constructor(private options: Options) {}

    public init(): Promise<NodeJS.Timeout> {
        return new Promise((resolve, reject) => {
            this.checkRegisteredApp().then(async () => {
                const timer = Log.loading('Waiting started server');

                this.app = fastify(this.options.server);
                if (this.options.subscribers.redis)
                    this.redis = this.options.redis.client ?? new RedisClient(this.options.redis.options);
                if (this.options.subscribers.nats)
                    this.nats = await connect(this.options.nats);
                this.io = new IoServer(this.app.server, this.options.socketio);

                await this.registerPlugins();

                this.middlewares();
                resolve(timer);
            }).catch(reject);
        });
    }

    public authorizeRequests(req: any, next: any): void {
        const appId = req.headers['x-app-id'];
        const appSecret = req.headers['x-app-secret'];

        if (this.options.app.id === appId &&
            this.options.app.secret === appSecret &&
            validate(appId) && version(appId) === 4
        ) {
            return next();
        }

        return next(new Error('Application invalid.'));
    }

    private checkRegisteredApp(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let valid = true;

            if (!this.options.app.id || !this.options.app.secret) {
                valid = false;

                reject('Application not registered!');
            }

            const id = this.options.app.id;
            const secret = this.options.app.secret;

            if (!validate(id) && version(id) === 4) {
                valid = false;

                reject('The app id is not correct.');
            }
            if (secret.length <= 0) {
                valid = false;

                reject('Please set app secret!');
            }

            if (valid) {
                resolve(valid);
            }
        });
    }

    private async registerPlugins(): Promise<void> {
        await this.app.register(require('middie'));
        await this.app.register(require('fastify-formbody'));
        await this.app.register(require('fastify-multipart'), {
            attachFieldsToBody: true
        });
    }

    private middlewares(): void {
        this.app.use(require('cors')(this.options.server.cors ?? {}));
        this.app.use((req: any, res: any, next: any) => this.authorizeRequests(req, next));

        this.io.use((req, next) => this.authorizeRequests(req.handshake, next));
    }
}
