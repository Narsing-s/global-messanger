import { api, API } from '../api';
import { securityApi, profileApi, organizationApi, messagingApi, supportApi, entitiesApi, notificationsApi } from './advanced-api';
export { api, API };
export const productApi={
 features:async()=>({features:{auth:true,messaging:true,groups:true,media:true,realtime:true,e2ee:true,privacy:true,scheduledMessages:true,polls:true,notifications:true,support:true}}),
 sessions:()=>securityApi.devices(),
 revokeSession:(id:string)=>securityApi.logoutDevice(id),
 revokeOthers:()=>securityApi.logoutOtherDevices(),
 privacy:()=>profileApi.privacy(),
 updatePrivacy:(body:Record<string,unknown>)=>profileApi.updatePrivacy(body),
 media:(params='')=>{const q=new URLSearchParams(params);return api.media(q.get('conversationId')||undefined,q.get('q')||undefined,Number(q.get('limit')||100));},
 universalSearch:(q:string)=>organizationApi.universalSearch(q),
 supportTickets:()=>supportApi.list(),
 createSupportTicket:(subject:string,category:string,description:string)=>supportApi.create(subject,category,description),
 entities:(kind?:string)=>entitiesApi.list(kind),
 createEntity:(kind:string,title:string,payload:Record<string,unknown>)=>entitiesApi.create(kind,title,payload),
 notifications:()=>notificationsApi.list(),
 markNotificationsRead:()=>notificationsApi.markRead(),
 createPoll:(conversationId:string,question:string,options:string[],multiple=false)=>messagingApi.createPoll(conversationId,question,options,multiple)
};
