import { reject } from 'lodash';
import { Client } from 'ts-nats';
import { Log } from '../log';
import { Options } from '../server';
import { Subscriber } from './subscriber';

export class NatsSubscriber implements Subscriber {
    public constructor(private server: Client, private options: Options) { }
    
    /**
     * Subscribe to incoming events.
     *
     * @param  {Function} callback
     * @return {void}
     */
    public subscribe(callback: Function): Promise<any> {
        return new Promise(() => {
            const prefix = this.options.nats
                ? this.options.nats.prefix ?? '' : '';

            this.server.subscribe(`${prefix}*`, async (err, msg) => {
                if (err) {
                    if (this.options.dev) {
                        Log.error(`${err.name} - ${err.message}`);
                    }

                    reject(err);
                } else if (!msg.reply) {
                    try {
                        let message = typeof msg.data === 'object'
                            ? msg.data : JSON.parse(msg.data);

                        if (message.event && message.data) {
                            if (this.options.dev) {
                                Log.default(`Channel: ${msg.subject}`);
                                Log.default(`Event: ${message.event}`);
                            }

                            callback(msg.subject.substring(prefix.length), message.event, message);
                        }
                    } catch (e) {
                        if (this.options.dev) {
                            Log.error('No JSON message');
                        }
    
                        reject(e);
                    }
                }
            });
        });
    }

    /**
     * Unsubscribe from incoming events
     *
     * @return {Promise}
     */
    public unsubscribe(): Promise<any> {
        return new Promise((resolve) => {
            resolve(true);
        });
    }
}
