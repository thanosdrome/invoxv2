// ====================================
// types/global.d.ts
// Global TypeScript Declarations
// ====================================
import { Connection } from 'mongoose';

declare global {
  var mongoose: {
    conn: Connection | null;
    promise: Promise<Connection> | null;
  };

  namespace NodeJS {
    interface ProcessEnv {
      MONGODB_URI: string;
      JWT_SECRET: string;
      RP_NAME: string;
      RP_ID: string;
      ORIGIN: string;
      NODE_ENV: 'development' | 'production' | 'test';
      NEXT_PUBLIC_APP_URL?: string;
    }
  }
}

export {};