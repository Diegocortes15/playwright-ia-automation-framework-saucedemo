type Level = 'debug' | 'info' | 'error';

const enabled: Record<Level, boolean> = {
  debug: process.env.LOG_LEVEL === 'debug',
  info: process.env.LOG_LEVEL !== 'silent',
  error: true,
};

export const logger = {
  debug: (msg: string): void => {
    if (enabled.debug) console.log(`[debug] ${msg}`);
  },
  info: (msg: string): void => {
    if (enabled.info) console.log(`[info] ${msg}`);
  },
  error: (msg: string): void => {
    if (enabled.error) console.error(`[error] ${msg}`);
  },
};
