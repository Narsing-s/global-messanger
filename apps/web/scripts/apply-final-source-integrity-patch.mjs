import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
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

/* Normalize the App state block after all product patches have run. */
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

/* Repair older/short state variants without relying on exact formatting. */
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

/*
 * Build safety net: historical product patches can emit malformed TSX when they
 * encounter a source shape they were not written for. Validate the final source
 * before writing it and restore the committed canonical source if needed.
 */
function syntaxDiagnostics(text) {
  try {
    const ts = require('typescript');
    const result = ts.transpileModule(text, {
      fileName: 'main.tsx',
      reportDiagnostics: true,
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext
      }
    });
    return (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  } catch (error) {
    console.warn('[integrity] TypeScript syntax validation unavailable:', error?.message || error);
    return [];
  }
}

const diagnostics = syntaxDiagnostics(source);
if (diagnostics.length) {
  try {
    const canonical = execFileSync('git', ['show', 'HEAD:apps/web/src/main.tsx'], { encoding: 'utf8' });
    const canonicalDiagnostics = syntaxDiagnostics(canonical);
    if (!canonicalDiagnostics.length) {
      source = canonical;
      changes++;
      console.warn(`[integrity] malformed patched main.tsx detected (${diagnostics.length} syntax error(s)); restored committed canonical source`);
    } else {
      console.warn(`[integrity] patched and canonical main.tsx both report syntax errors; preserving patched source`);
    }
  } catch (error) {
    console.warn('[integrity] canonical source recovery failed:', error?.message || error);
  }
}

fs.writeFileSync(file, source);
console.log(`[integrity] source integrity patch ${changes ? 'applied' : 'already clean'}`);
