type Level = 'debug' | 'info' | 'error';

const enabled: Record<Level, boolean> = {
  debug: process.env.LOG_LEVEL === 'debug',
  info: process.env.LOG_LEVEL !== 'silent',
  error: true,
};

export const logger = {
  debug: (msg: string) => enabled.debug && console.log(`[debug] ${msg}`),
  info: (msg: string) => enabled.info && console.log(`[info] ${msg}`),
  error: (msg: string) => enabled.error && console.error(`[error] ${msg}`),
};
