import { Subscriber } from './subscriber';
import { Options } from '../server';
import { Log } from '../log';

export class HttpSubscriber implements Subscriber {
    /**
     * Create new instance of http subscriber.
     *
     * @param  {any} app
     */
    public constructor(private server: any, private options: Options) { }

    /**
     * Subscribe to events to broadcast.
     *
     * @return {void}
     */
    public subscribe(callback: Function): Promise<any> {
        return new Promise((resolve, reject) => {
            // Broadcast a message to a channel
            this.server.post('/:channel', async (req, res) => {
                this.handle(req, res, callback);
            });
        });
    }

    /**
     * Unsubscribe from events to broadcast.
     *
     * @return {Promise}
     */
    public unsubscribe(): Promise<any> {
        return new Promise((resolve, reject) => {
            resolve(true);
        });
    }

    /**
     * Handle incoming event data.
     *
     * @param  {any} req
     * @param  {any} res
     * @param  {Function} broadcast
     * @return {any}
     */
    private handle(req: any, res: any, broadcast: Function): any {
        let body = req.body ?? req.query;
        try {
            body = JSON.parse(body);
        } catch (e) { }

        const channel = req.params.channel ?? undefined;
        const event =  body.event ? (body.event.value ?? body.event) : undefined;
        const socket = body.socket_id ? (body.socket_id.value ?? body.socket_id) : undefined;
        const namespace = body.namespace ? (body.namespace.value ?? body.namespace) : undefined;
        if (channel && event && body.data) {
            let data = body.data.value ?? body.data;
            try {
                data = JSON.parse(data);
            } catch (e) { }

            const message = { event, data, socket };
            
            if (this.options.dev) {
                Log.default(`Channel: ${channel}`);
                Log.default(`Event: ${event}`);
            }

            broadcast(channel, message, namespace);
        } else {
            res.statusCode = 400;
            res.send({ error: 'Event must include channel, event name and data' });
        }

        res.send({ channel, event, message: 'Ok' });
    }
}
