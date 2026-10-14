import { pino, type Logger } from 'pino'
import { configure } from '@logtape/logtape'
import { getPinoSink } from '@logtape/adaptor-pino'

export const configureLogging = async (): Promise<Logger> => {
    const logger = pino({
        level: 'trace',
    })

    await configure({
        sinks: { pino: getPinoSink(logger) },
        loggers: [
            { category: ['core'], sinks: ['pino'], lowestLevel: 'trace' },
        ],
    })

    return logger
}
