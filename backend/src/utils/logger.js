const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

let transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
  }),
];

if (!process.env.VERCEL) {
  const logDir = 'logs';
  const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logDir, '%DATE%-results.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
  });
  transports.push(dailyRotateFileTransport);
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports,
});

module.exports = logger;
