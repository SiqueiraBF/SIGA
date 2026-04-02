import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'nadiana_offline_db';
const STORE_NAME = 'pending_drainages';
const DB_VERSION = 1;

export interface OfflineDrainage {
    id?: any;
    data: any; // O objeto args que vai para o useDrainageSubmit
    timestamp: number;
}

class OfflineSyncService {
    private db: Promise<IDBPDatabase>;

    constructor() {
        this.db = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            },
        });
    }

    async enqueue(data: any): Promise<any> {
        const db = await this.db;
        return db.add(STORE_NAME, {
            data,
            timestamp: Date.now(),
        });
    }

    async getQueue(): Promise<OfflineDrainage[]> {
        const db = await this.db;
        return db.getAll(STORE_NAME);
    }

    async dequeue(id: any): Promise<void> {
        const db = await this.db;
        await db.delete(STORE_NAME, id);
    }

    async clearQueue(): Promise<void> {
        const db = await this.db;
        await db.clear(STORE_NAME);
    }

    async getQueueCount(): Promise<number> {
        const db = await this.db;
        return db.count(STORE_NAME);
    }
}

export const offlineSyncService = new OfflineSyncService();
