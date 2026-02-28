import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { OmdbStore } from '../../../openmcp-sdk/service/sdk.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.resolve(__dirname, '..', 'dataset', 'omdb-test');

async function testOmdbWriteRead() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true });
    }

    const store = new OmdbStore(TEST_DIR, 'test_kv');

    console.log('OmdbStore db path:', store.getDbPath());

    await store.write('id-001', { name: 'alpha', value: 1 });
    await store.write('id-002', { name: 'beta', value: 2 });
    await store.write('id-003', { name: 'gamma', value: 3 });

    const count = await store.count();
    console.log('count after write:', count);
    if (count !== 3) {
        throw new Error(`Expected count 3, got ${count}`);
    }

    const r1 = await store.read('id-001');
    if (!r1 || (r1.data as { name: string }).name !== 'alpha') {
        throw new Error(`Expected { name: 'alpha', value: 1 }, got ${JSON.stringify(r1)}`);
    }
    console.log('read id-001:', r1);

    const all = await store.readAll(10);
    if (all.length !== 3) {
        throw new Error(`Expected 3 records from readAll, got ${all.length}`);
    }
    console.log('readAll:', all);

    await store.write('id-001', { name: 'alpha-updated', value: 10 });
    const r1Updated = await store.read('id-001');
    if (!r1Updated || (r1Updated.data as { name: string }).name !== 'alpha-updated') {
        throw new Error(`Expected updated data, got ${JSON.stringify(r1Updated)}`);
    }
    console.log('read id-001 after update:', r1Updated);

    const dbPath = store.getDbPath();
    store.close();

    if (!fs.existsSync(dbPath)) {
        throw new Error(`Expected directory to exist: ${dbPath}`);
    }
    const files = fs.readdirSync(dbPath);
    if (files.length === 0) {
        throw new Error(`Expected at least one file in ${dbPath}`);
    }
    console.log('omdb test passed, files:', files.length, 'in', dbPath);
}

testOmdbWriteRead().catch((err) => {
    console.error('omdb test failed:', err);
    process.exit(1);
});
