export { ensureDatabaseInitialized } from './init';
export { getDb, closeDb, schema } from './client';
export { ConfigRepository, CONFIG_KEYS } from './repositories/configRepository';
export { CustomCommandRepository } from './repositories/customCommandRepository';
export type { Config, NewConfig, CustomCommand, NewCustomCommand } from './schema';
