import React from 'react';
import CompleteOperationsCenter from './CompleteOperationsCenter';

type Props={onClose:()=>void;user:any;chats?:any[];activeChat?:any|null;onOpenDirect?:(chat:any)=>void};
export default function OperationsCenterBridge({onClose,user,chats=[],activeChat=null,onOpenDirect}:Props){
 return <CompleteOperationsCenter onClose={onClose} activeChat={activeChat} onOpenDirect={onOpenDirect}/>;
}
