export interface ChannelInterface {
    /**
     * Join a channel.
     */
    join(socket: any, data: any): void;

    /**
     * Leave a channel.
     */
    leave(socket: any, data: any, reason?: string): void;
}
