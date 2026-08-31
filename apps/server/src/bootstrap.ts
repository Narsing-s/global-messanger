import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { registerAdvancedRoutes } from './advanced.js';

const instance = Fastify();
const prototype = Object.getPrototypeOf(instance);
const originalListen = prototype.listen;

if (!(prototype as any).__globalMessengerAdvancedPatched) {
  (prototype as any).__globalMessengerAdvancedPatched = true;
  prototype.listen = async function patchedListen(this: any, options: any) {
    if (!this.__globalMessengerAdvancedRegistered) {
      const prisma = new PrismaClient();
      await registerAdvancedRoutes(this, prisma);
      this.__globalMessengerAdvancedRegistered = true;
      this.addHook('onClose', async () => {
        await prisma.$disconnect();
      });
    }
    return originalListen.call(this, options);
  };
}

await instance.close();
await import('./index.js');
