import { aiApi } from '../../services/advanced-api';

export const advancedAi = aiApi;

export async function summarizeConversation(conversationId: string) {
  return aiApi.conversationSummary(conversationId);
}

export async function understandDocument(text: string, filename?: string) {
  return aiApi.documentUnderstanding(text, filename);
}
