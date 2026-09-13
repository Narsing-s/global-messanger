import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/main.tsx');
let source = fs.readFileSync(file, 'utf8');
let changes = 0;

const decryptImport = "import { decryptMessageCompat } from './e2ee-compat';";

/* Keep exactly one decrypt import. */
{
  const lines = source.split('\n');
  let seen = false;
  const deduped = lines.filter(line => {
    if (line.trim() !== decryptImport) return true;
    if (seen) return false;
    seen = true;
    return true;
  });
  const next = deduped.join('\n');
  if (next !== source) changes++;
  source = next;

  if (source.includes('decryptMessageCompat') && !source.split('\n').some(line => line.trim() === decryptImport)) {
    const anchor = "import { installEnhancements } from './enhancements';";
    if (source.includes(anchor)) {
      source = source.replace(anchor, `${anchor}\n${decryptImport}`);
      changes++;
    }
  }
}

/*
 * Normalize the App state block after all product patches have run.
 * Several historical patches edited adjacent state declarations with broad
 * string replacements. This keeps every hook exactly once and restores the
 * state variables required by the event handlers and JSX.
 */
{
  const stateStart = source.indexOf("  const [socket,setSocket]=useState<Socket|null>(null)");
  const stateEnd = source.indexOf("  const fileRef=useRef<HTMLInputElement>(null)", stateStart);

  if (stateStart >= 0 && stateEnd > stateStart) {
    const canonical = `  const [socket,setSocket]=useState<Socket|null>(null),[typing,setTyping]=useState(false),[socketError,setSocketError]=useState(''),[mobileChat,setMobileChat]=useState(false),[rightOpen,setRightOpen]=useState(true),[blockedSent,setBlockedSent]=useState<Record<string,boolean>>({});\n  const [groupOpen,setGroupOpen]=useState(false),[groupTitle,setGroupTitle]=useState(''),[groupUsers,setGroupUsers]=useState<User[]>([]),[menu,setMenu]=useState<string|null>(null),[reply,setReply]=useState<Message|null>(null),[emojiOpen,setEmojiOpen]=useState(false),[reaction,setReaction]=useState<string|null>(null),[editing,setEditing]=useState<Message|null>(null),[aiLoading,setAiLoading]=useState(false),[presence,setPresence]=useState<Record<string,boolean>>({});\n`;
    const before = source.slice(0, stateStart);
    const after = source.slice(stateEnd);
    const current = source.slice(stateStart, stateEnd);
    if (current !== canonical) {
      source = before + canonical + after;
      changes++;
    }
  }
}

/* Some patch combinations can leave the state block in an older, shorter form.
 * If that happens, repair the whole block from the App function boundary instead
 * of relying on an exact indentation-sensitive anchor. */
{
  const appStart = source.indexOf('function App(');
  const stateStart = source.indexOf("  const [socket,setSocket]=useState<Socket|null>(null)", appStart);
  const fileRef = source.indexOf("  const fileRef=useRef<HTMLInputElement>(null)", stateStart);
  if (appStart >= 0 && stateStart >= 0 && fileRef > stateStart) {
    const block = source.slice(stateStart, fileRef);
    const required = ['socketError','setSocketError','mobileChat','setMobileChat','rightOpen','setRightOpen','blockedSent','aiLoading','presence'];
    if (required.some(token => !block.includes(token))) {
      const canonical = `  const [socket,setSocket]=useState<Socket|null>(null),[typing,setTyping]=useState(false),[socketError,setSocketError]=useState(''),[mobileChat,setMobileChat]=useState(false),[rightOpen,setRightOpen]=useState(true),[blockedSent,setBlockedSent]=useState<Record<string,boolean>>({});\n  const [groupOpen,setGroupOpen]=useState(false),[groupTitle,setGroupTitle]=useState(''),[groupUsers,setGroupUsers]=useState<User[]>([]),[menu,setMenu]=useState<string|null>(null),[reply,setReply]=useState<Message|null>(null),[emojiOpen,setEmojiOpen]=useState(false),[reaction,setReaction]=useState<string|null>(null),[editing,setEditing]=useState<Message|null>(null),[aiLoading,setAiLoading]=useState(false),[presence,setPresence]=useState<Record<string,boolean>>({});\n`;
      source = source.slice(0, stateStart) + canonical + source.slice(fileRef);
      changes++;
    }
  }
}

fs.writeFileSync(file, source);
console.log(`[integrity] source integrity patch ${changes ? 'applied' : 'already clean'}`);
