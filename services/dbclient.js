import { PrismaClient } from '@prisma/client';

let prisma;
/*
-using simple instatiation for production because server only runs 
once but using 'globalThis' for local because everytime changes made to file results in 
 server reload which leads to recreation of prisma connection with previous one running
 - 'globalThis' keeps one connection surviving server reload

*/
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!globalThis.__prisma) {
    globalThis.__prisma = new PrismaClient();
  }
  prisma = globalThis.__prisma;
}

export default prisma;