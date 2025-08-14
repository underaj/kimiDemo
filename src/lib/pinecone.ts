import { AIMessageType } from '@/types/common';
import { Pinecone } from '@pinecone-database/pinecone';
import axios from 'axios';
import OpenAI from 'openai';

const GPT_API_BASE_PARAMS = {
  userId: 'toby',
  modelId: '66e69fba475ef8897aed954f',
  params: {
    temperature: 0
  },
  retry: {
    behavior: 'retry',
    max_retry: 1
  }
};

// 配置
const CONFIG = {
  PINECONE_API_KEY: process.env.PINECONE_API_KEY || '',
  OPENAI_API_KEY: process.env.OPEN_AI_API_KEY || '',
  PINECONE_INDEX_NAME: 'pro-profiles',
  PINECONE_EMBED_MODEL: process.env.PINECONE_EMBED_MODEL || 'text-embedding-3-small',
};

// 定义数据项类型
export interface DataItem {
  id: string;
  category: string;
  text: string;
  values: number[];
  metadata: {
    id: string;
    category: string;
  };
}

// 定义默认的 metadata 类型
export interface DefaultPineconeMetadata {
  [key: string]: any;
}

// 定义搜索结果的泛型接口
export interface PineconeSearchResult<T = DefaultPineconeMetadata> {
  id: string;
  score?: number;
  values?: number[];
  metadata?: T;
}

// 单例 Pinecone 客户端
let pineconeClient: Pinecone | null = null;

// 初始化 Pinecone 客户端（单例模式）
export const initializePinecone = (): Pinecone => {
  if (pineconeClient) {
    return pineconeClient;
  }

  if (!CONFIG.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY is required');
  }
  
  pineconeClient = new Pinecone({
    apiKey: CONFIG.PINECONE_API_KEY,
  });

  return pineconeClient;
};

// 初始化 OpenAI 客戶端
let openaiClient: OpenAI | null = null;

const initializeOpenAI = (): OpenAI => {
  if (openaiClient) {
    return openaiClient;
  }

  if (!CONFIG.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required');
  }

  openaiClient = new OpenAI({
    apiKey: CONFIG.OPENAI_API_KEY,
  });

  return openaiClient;
};

export const callGPT = async (messages: AIMessageType[]) => {
  const result = await axios.post('http://18.136.221.208:3210/models/chatgpt/chat', {
    ...GPT_API_BASE_PARAMS,
    messages,
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  return result.data?.data?.choices?.[0];
};

// 使用 OpenAI 生成嵌入向量
export const generateEmbeddingsWithOpenAI = async (texts: string[]): Promise<number[][]> => {
  const openai = initializeOpenAI();
  
  const response = await openai.embeddings.create({
    model: CONFIG.PINECONE_EMBED_MODEL,
    input: texts,
    encoding_format: 'float',
  });
  
  return response.data.map(item => item.embedding);
};

export const storeEmbeddings = async (data: DataItem[]): Promise<number> => {
  const pinecone = initializePinecone();
  const index = pinecone.index(CONFIG.PINECONE_INDEX_NAME);

  const vectors = data.map((item) => ({
    id: item.id,
    values: item.values,
    metadata: item.metadata,
  }));
  
  await index.upsert(vectors);

  return vectors.length;
};

// 智能查詢擴展函數
const expandQuery = async (query: string, prompt: string): Promise<string[]> => {
  const finalPrompt = `
    用戶查詢: "${query}"
    ${prompt}
  `;

  try {
    const response = await callGPT([{ role: 'user', content: finalPrompt }]);

    const expandedQueries = response?.message?.content
      ?.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.trim()) || [];

    // 返回原始查詢 + 擴展查詢
    return [query, ...expandedQueries].slice(0, 5);
  } catch (error) {
    console.error('查詢擴展失敗:', error);
    // 回退到原始查詢
    return [query];
  }
};

// 在 Pinecone 中搜索相似項目（使用 OpenAI 嵌入）
export const searchSimilar = async <T = DefaultPineconeMetadata>(
  query: string, 
  topK: number = 10,
  expandPrompt: string
): Promise<PineconeSearchResult<T>[]> => {
  const pinecone = initializePinecone();
  const index = pinecone.index(CONFIG.PINECONE_INDEX_NAME);
  
  // 1. 擴展查詢
  const expandedQueries = await expandQuery(query, expandPrompt);
  console.log('擴展查詢:', expandedQueries);
  
  const allResults: PineconeSearchResult<T>[] = [];
  
  // 2. 對每個擴展查詢進行搜索
  for (let i = 0; i < expandedQueries.length; i++) {
    const currentQuery = expandedQueries[i];
    
    try {
      // 生成嵌入向量
      const queryEmbeddings = await generateEmbeddingsWithOpenAI([currentQuery]);
      const queryVector = queryEmbeddings[0];
      
      // 搜索
      const searchResults = await index.query({
        vector: queryVector,
        topK: Math.ceil(topK * 1.5), // 每個查詢獲取稍多一些結果
        includeMetadata: true,
        includeValues: false
      });
      
      let results = (searchResults.matches || []) as PineconeSearchResult<T>[];
      
      // 為原始查詢（第一個）的結果稍微加權
      if (i === 0) {
        results = results.map(result => ({
          ...result,
          score: result.score ? result.score * 1.05 : result.score
        }));
      }
      
      allResults.push(...results);
    } catch (error) {
      console.error(`查詢 "${currentQuery}" 搜索失敗:`, error);
    }
  }
  
  // 3. 去重 - 保留每個ID的最高分數結果
  const uniqueResults = new Map<string, PineconeSearchResult<T>>();
  
  allResults.forEach(result => {
    const existingResult = uniqueResults.get(result.id);
    if (!existingResult || (result.score && existingResult.score && result.score > existingResult.score)) {
      uniqueResults.set(result.id, result);
    }
  });
  
  // 4. 排序並返回
  const finalResults = Array.from(uniqueResults.values())
    .filter(result => result.score && result.score >= 0.3) // 稍微降低閾值
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, topK);
    
  console.log(`查詢擴展結果: ${finalResults.length} 個，分數範圍: ${finalResults[0]?.score?.toFixed(3)} - ${finalResults[finalResults.length-1]?.score?.toFixed(3)}`);
  
  return finalResults;
};
