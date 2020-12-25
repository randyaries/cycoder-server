import { Log } from '../log';
import { ChannelInterface } from './interface';

export class Channel implements ChannelInterface {
    /**
     * Join a channel.
     */
    public join(socket: any, data: any): void {
        socket.join(data.channel);

        Log.default(`[${new Date().toISOString()}] - ${socket.id} joined channel: ${data.channel}`);
    }

    /**
     * Leave a channel.
     */
    public leave(socket: any, channel: string, reason?: string): void {
        socket.leave(channel);

        reason = !reason ? '' : `(${reason})`;
        Log.default(`[${new Date().toISOString()}] - ${socket.id} left channel: ${channel} ${reason}`);
    }
}