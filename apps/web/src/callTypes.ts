export type CallType = 'audio' | 'video';

export type CallSignal = {
  callId: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  type: CallType;
  signal?: RTCSessionDescriptionInit | RTCIceCandidateInit;
};
