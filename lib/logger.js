const pino = require('pino');

const isDev = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-auth-token"]',
  '*.password',
  '*.pass',
  '*.token',
  '*.secret',
  '*.creditCard',
  '*.cardNumber',
  '*.card_number',
  '*.better_auth_secret',
  '*.email_pass',
  '*.api_secret',
  '*.GOOGLE_CLIENT_SECRET'
];

const loggerOptions = {
  level: logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]'
  },
  base: {
    env: process.env.NODE_ENV || 'development'
  }
};

if (isDev) {
  try {
    loggerOptions.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname,env'
      }
    };
  } catch (e) {
    // Se pino-pretty falhar, mantém log padrão
  }
}

const logger = pino(loggerOptions);

module.exports = logger;
