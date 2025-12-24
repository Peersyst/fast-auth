export class LoggerService {
    private readonly logger = console;

    /**
     * Logs a message.
     * @param context The context of the message.
     * @param message The message to log.
     */
    log(context: string, message: string) {
        this.logger.log(`[${context}]\t${message}`);
    }

    /**
     * Logs an error message.
     * @param context The context of the message.
     * @param message The message to log.
     */
    error(context: string, message: string) {
        this.logger.error(`[${context}]\t${message}`);
    }

    /**
     * Logs a warning message.
     * @param context The context of the message.
     * @param message The message to log.
     */
    warn(context: string, message: string) {
        this.logger.warn(`[${context}]\t${message}`);
    }

    /**
     * Logs a debug message.
     * @param context The context of the message.
     * @param message The message to log.
     */
    debug(context: string, message: string) {
        this.logger.debug(`[${context}]\t${message}`);
    }
}
