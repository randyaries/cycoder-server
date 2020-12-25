const colors = require('colors');

colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'cyan',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red',
    h1: 'grey',
    h2: 'yellow'
});

export class Log {
    /**
     * Console log heading 1.
     *
     * @param {string|object} message
     * @return {void}
     */
    public static title(message: string): void {
        console.log(colors.bold(colors.dim(colors.magenta(message))));
    }

    /**
     * Console log heaing 2.
     *
     * @param {string|object} message
     * @return {void}
     */
    public static subtitle(message: string): void {
        console.log(colors.h2.bold(message));
    }

    public static default(message: string): void {
        console.log(message);
    }

    /**
     * Console log info.
     *
     * @param  {string|object} message
     * @return {void}
     */
    public static info(message: string): void {
        console.log(colors.info(message));
    }

    /**
     * Console log success.
     *
     * @param  {string|object} message
     * @return {void}
     */
    public static success(message: string): void {
        console.log(colors.green('\u2714 '), message);
    }

    /**
     * Console log error.
     *
     * @param  {string|object} message
     * @return {void}
     */
    public static error(message: string): void {
        console.log(colors.red('\u2717'), message);
    }

    /**
     * Console log warning.
     *
     * @param  {string|object} message
     * @return {void}
     */
    public static warning(message: any): void {
        console.log(colors.warn('\u26A0 ' + message));
    }

    /**
     * Console log clear.
     * 
     * @return {void}
     */
    public static clear(): void {
        console.clear();
    }

    public static removeUp(dir: number): void {
        process.stdout.moveCursor(0, -Math.abs(dir));
        process.stdout.cursorTo(0);
        process.stdout.clearScreenDown();
    }

    public static removeDown(dir: number): void {
        process.stdout.moveCursor(0, Math.abs(dir));
        process.stdout.cursorTo(0);
        process.stdout.clearScreenDown();
    }

    public static loading(message: string): NodeJS.Timeout {
        let dots = '';

        process.stdout.write(colors.info(`${message} `));
        return setInterval(() => {
            dots += '.';

            process.stdout.write(colors.info(`\r${message}${dots}`));
        }, 1000);
    }
}