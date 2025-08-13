export type MediaType = {
  mediaType: 'TITLE' | 'TEXT' | 'IMAGE' | 'YOUTUBE' | 'JSON' | 'VIDEO';
  mediaUrl: string;
  thumbnailUrl: string;
  subject: string;
  id: string;
  sequence: number;
  relatedMediasCount: number;
};

export type MedalType = {
  code: string;
  icon: string;
  name: string;
  tip: string;
};

export type AIMessageType = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};
