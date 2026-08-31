import fs from 'node:fs';
const path='apps/web/src/main.tsx';
let s=fs.readFileSync(path,'utf8');
if(!s.includes('class GlobalMessengerErrorBoundary')){
  s=s.replace("import React,{useEffect,useRef,useState}from'react';", "import React,{Component,useEffect,useRef,useState}from'react';");
  const marker="function App(){";
  const boundary="class GlobalMessengerErrorBoundary extends Component<{children:React.ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}};componentDidCatch(error:unknown){console.error('[Global Messenger UI error]',error)};render(){if(this.state.failed)return <div className=\"gm-fatal-error\"><div><h1>Global Messenger</h1><p>We recovered from a temporary display error.</p><button onClick={()=>window.location.reload()}>Reload Messenger</button></div></div>;return this.props.children}}\n";
  s=s.replace(marker,boundary+marker);
  s=s.replace("createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);", "createRoot(document.getElementById('root')!).render(<React.StrictMode><GlobalMessengerErrorBoundary><App/></GlobalMessengerErrorBoundary></React.StrictMode>);");
}
fs.writeFileSync(path,s);
console.log('[error-boundary] UI crash recovery applied');
