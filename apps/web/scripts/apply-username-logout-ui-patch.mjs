import fs from 'node:fs';

const file = 'src/main.tsx';
if (!fs.existsSync(file)) throw new Error('Username/logout UI patch: src/main.tsx not found');

let source = fs.readFileSync(file, 'utf8');
const guard = '/* username-logout-ui-v1 */';
if (!source.includes(guard)) {
  const old = '<div className="profile-mini"><Avatar user={user}/><div><b>{user.displayName}</b><Status online={true}/></div><button className="icon-button" onClick={logout}><LogOut/></button></div>';
  const next = `<div className="profile-mini ${guard}"><Avatar user={user}/><div className="profile-mini-copy"><b>{user.displayName}</b><small>@{user.username}</small><Status online={true}/></div><button className="profile-logout" onClick={logout} title="Log out"><LogOut/><span>Log out</span></button></div>`;
  if (!source.includes(old)) throw new Error('Username/logout UI patch: profile anchor not found');
  source = source.replace(old, next);
  fs.writeFileSync(file, source);
  console.log('[UI] username and visible logout button restored');
}

const cssFile = 'src/styles.css';
if (fs.existsSync(cssFile)) {
  let css = fs.readFileSync(cssFile, 'utf8');
  const cssGuard = '/* username-logout-ui-styles-v1 */';
  if (!css.includes(cssGuard)) {
    css += `\n${cssGuard}\n.profile-mini-copy{display:flex;flex-direction:column;min-width:0;flex:1}.profile-mini-copy>b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.profile-mini-copy small{font-size:12px;opacity:.68;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.profile-logout{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid rgba(127,127,127,.22);border-radius:10px;padding:8px 10px;background:transparent;cursor:pointer}.profile-logout svg{width:17px;height:17px}.profile-logout span{font-size:12px;font-weight:700}.profile-logout:hover{background:rgba(127,127,127,.10)}\n`;
    fs.writeFileSync(cssFile, css);
    console.log('[UI] username/logout styles added');
  }
}
