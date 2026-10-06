import { RedisSimEngine } from '@codeadda/engine-redis-sim';
import { serveEngine } from './serve';

serveEngine(new RedisSimEngine());
