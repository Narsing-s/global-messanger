import CompleteOperationsCenter from './CompleteOperationsCenter';

type Props={onClose:()=>void;user:any;chats:any[];activeChat?:any|null};

export default function ProductCenter({onClose,activeChat}:Props){
  return <CompleteOperationsCenter
    activeChat={activeChat}
    onClose={onClose}
    onOpenDirect={(chat)=>window.dispatchEvent(new CustomEvent('gm:open-direct',{detail:chat}))}
  />;
}
