import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase() {
  if (db) {
    return { client, db };
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db();
    console.log('Connected to MongoDB');
    return { client, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function getDatabase(): Promise<Db> {
  if (!db) {
    const connection = await connectToDatabase();
    return connection.db!;
  }
  return db;
}

/**
 * Store location history in MongoDB for audit purposes
 */
export async function storeLocationHistory(data: {
  taskId: string;
  driverId: string;
  lat: number;
  lng: number;
  speed: number;
  timestamp: number;
  status: string;
}) {
  try {
    const database = await getDatabase();
    const collection = database.collection('location_history');
    
    await collection.insertOne({
      ...data,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error storing location history:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Store task completion data
 */
export async function storeTaskCompletion(data: {
  taskId: string;
  driverId: string;
  completedAt: Date;
  totalDistance: number;
  totalDuration: number;
}) {
  try {
    const database = await getDatabase();
    const collection = database.collection('completed_tasks');
    
    await collection.insertOne({
      ...data,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error storing task completion:', error);
  }
}

export default { connectToDatabase, getDatabase };
