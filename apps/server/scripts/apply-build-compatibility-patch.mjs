import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const schemaPath = path.resolve(root, 'prisma/schema.prisma');
const productionPath = path.resolve(root, 'src/production-capabilities.ts');
const completionPath = path.resolve(root, 'src/global-completion.ts');
const marketPath = path.resolve(root, 'src/global-market-platform.ts');
const sfuPath = path.resolve(root, 'src/sfu.ts');

if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, 'utf8');
  if (!schema.includes('model GlobalEntity')) {
    schema += `\n\nmodel GlobalEntity {\n  id        String   @id @default(cuid())\n  ownerId   String\n  kind      String\n  name      String\n  data      Json\n  status    String   @default("active")\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n  @@index([ownerId, kind, status])\n  @@index([ownerId, name, status])\n}\n\nmodel DeveloperApiKey {\n  id         String    @id @default(cuid())\n  userId     String\n  name       String\n  keyHash    String    @unique\n  prefix     String\n  scopes     Json\n  active     Boolean   @default(true)\n  lastUsedAt DateTime?\n  revokedAt  DateTime?\n  createdAt  DateTime  @default(now())\n  @@index([userId, active, revokedAt])\n}\n`;
    fs.writeFileSync(schemaPath, schema);
  }
}

if (fs.existsSync(completionPath)) {
  let s = fs.readFileSync(completionPath, 'utf8');
  s = s.replace(/prisma\.globalEntity\.create\(\{ data: \{ ownerId, kind: 'security', name, data, status \} \}\)/g, "prisma.globalEntity.create({ data: { ownerId, kind: 'security', name, data: data as any, status } })");
  fs.writeFileSync(completionPath, s);
}

if (fs.existsSync(productionPath)) {
  let s = fs.readFileSync(productionPath, 'utf8');
  s = s.replace(/type EntityKind = 'call'\|'webhook'\|'bot'\|'miniapp'\|'business'\|'catalog'\|'ticket'\|'ai'\|'security'\|'region';/g, "type EntityKind = string;");
  s = s.replace(/async function entity\(prisma: PrismaClient, ownerId: string, kind: EntityKind, data: any, (?:name = kind, status = 'active'|status = 'active')\)/, "async function entity(prisma: PrismaClient, ownerId: string, kind: EntityKind, data: any, name = kind, status = 'active')");
  s = s.replace(/String\(request\.params\.id\)/g, 'String((request.params as any).id)');
  s = s.replace(/callId: request\.params/g, 'callId: (request.params as any)');
  s = s.replace(/listEntities\(prisma,userOf\(request\),'catalog'\)/g, "listEntities(prisma,userOf(request).id,'catalog')");
  fs.writeFileSync(productionPath, s);
}

if (fs.existsSync(marketPath)) {
  let s = fs.readFileSync(marketPath, 'utf8');
  s = s.replace(/request\.body\?\.url/g, '(request.body as any)?.url');
  s = s.replace(/request\.body\?\.events/g, '((request.body as any)?.events)');
  fs.writeFileSync(marketPath, s);
}

if (fs.existsSync(sfuPath)) {
  let s = fs.readFileSync(sfuPath, 'utf8');
  s = s.replace("{ kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 }", "{ kind: 'audio', mimeType: 'audio/opus', preferredPayloadType: 111, clockRate: 48000, channels: 2 }");
  s = s.replace("{ kind: 'video', mimeType: 'video/VP8', clockRate: 90000 }", "{ kind: 'video', mimeType: 'video/VP8', preferredPayloadType: 96, clockRate: 90000 }");
  s = s.replace("{ kind: 'video', mimeType: 'video/H264', clockRate: 90000, parameters:", "{ kind: 'video', mimeType: 'video/H264', preferredPayloadType: 102, clockRate: 90000, parameters:");
  s = s.replace('maxSctpMessageSize: 262144', 'maxSendMessageSize: 262144');
  s = s.replace("transport.on('close', cleanup);", "transport.observer.on('close', cleanup);");
  s = s.replace("producer.on('close', cleanup);", "producer.observer.on('close', cleanup);");
  fs.writeFileSync(sfuPath, s);
}

console.log('Build compatibility patch applied');
