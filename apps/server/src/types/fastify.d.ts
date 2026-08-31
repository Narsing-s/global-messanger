import type { FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string; email?: string };
  }
}

export type IdParams = { id: string };
export type ConversationIdParams = { id: string };
