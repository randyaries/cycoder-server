import { Log } from '../log';
import { Options } from '../server';
import { Subscriber } from './subscriber';

export class RedisSubscriber implements Subscriber {
    public constructor(private server: any, private options: Options) { }

    /**
     * Subscribe to incoming events.
     *
     * @param  {Function} callback
     * @return {void}
     */
    public subscribe(callback: Function): Promise<any> {
        return new Promise((resolve, reject) => {
            const prefix = this.options.redis.prefix ?? '';

            this.server.on('pmessage', (pattern: string, channel: string, message: any) => {
                try {
                    message = JSON.parse(message);

                    if (message.event && message.data) {
                        if (this.options.dev) {
                            Log.default(`Channel: ${channel}`);
                            Log.default(`Event: ${message.event}`);
                        }
                        
                        callback(channel.substring(prefix.length), message.event, message);
                    }
                } catch (e) {
                    if (this.options.dev) {
                        Log.error('No JSON message');
                    }

                    reject(e);
                }
            });

            this.server.psubscribe(`${prefix}*`, (err: any, count: any) => {
                if (err) {
                    if (this.options.dev) {
                        Log.error('Redis could not subscribe.');
                    }

                    reject();
                }

                resolve(true);
            });
        });
    }

    /**
     * Unsubscribe from incoming events
     *
     * @return {Promise}
     */
    public unsubscribe(): Promise<any> {
        return new Promise((resolve, reject) => {
            resolve(true);
        });
    }
}
