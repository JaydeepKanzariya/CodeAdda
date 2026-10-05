import { MongoSimEngine } from '@codeadda/engine-mongo-sim';
import { serveEngine } from './serve';

serveEngine(new MongoSimEngine());
