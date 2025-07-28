import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { JSDOM } from 'jsdom';
import { SYSTEM_PROMPT } from './data';
import { ChatCompletionMessageParam } from 'openai/resources';

const CONFIG = {
  KIMI_API_KEY: process.env.KIMI_API_KEY,
  API_BASE_URL: 'https://api.moonshot.cn/v1',
  MODEL: 'moonshot-v1-128k-vision-preview',
  TEMPERATURE: 0.3,
  MAX_ITERATIONS: 10,
  TIMEOUT: 10000,
  MAX_CONTENT_LENGTH: 30000,
  MAX_LINKS: 10,
  MAX_IMAGES: 10,
  MAX_TOKENS: 8000,
};

const AXIOS_CONFIG = {
  timeout: CONFIG.TIMEOUT,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-HK,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  },
  maxRedirects: 5,
  validateStatus: function (status: number) {
    return status >= 200 && status < 300;
  }
};

// Kimi Tools Format
const TOOLS = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "搜索和抓取網頁內容，返回網頁的文本內容和結構化信息",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          query: {
            type: "string",
            description: "要搜索的網址或關鍵詞"
          }
        }
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "fetch_url_content",
      description: "直接抓取指定網址的內容",
      parameters: {
        type: "object",
        required: ["url"],
        properties: {
          url: {
            type: "string",
            description: "要抓取的完整網址"
          }
        }
      }
    }
  }
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 新增：智能內容提取配置
const CONTENT_EXTRACTION_CONFIG = {
  // 主要內容選擇器（按優先級排序）
  primarySelectors: [
    'main',
    '[role="main"]',
    '.main-content',
    '.content',
    'article',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.blog-content',
    '.page-content',
    '#content',
    '#main',
    '.container .content',
    'body'
  ],
  
  // 需要移除的元素選擇器
  removeSelectors: [
    'script', 'style', 'nav', 'footer', 'header',
    '.ad', '.ads', '.advertisement', '.sidebar',
    '.navigation', '.menu', '.breadcrumb',
    '.social-share', '.comments', '.comment',
    '.popup', '.modal', '.overlay',
    '[class*="ad-"]', '[id*="ad-"]',
    '.cookie-notice', '.newsletter'
  ],
  
  // 內容質量評估參數
  minContentLength: 100,
  minWordCount: 20,
  maxDuplicateRatio: 0.8
};

// 新增：URL標準化函數
const normalizeUrl = (url: string, baseUrl: string): string => {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
};

// 新增：文本清理函數  
const cleanText = (text: string): string => {
  return text
    // 移除多餘空白
    .replace(/\s+/g, ' ')
    // 移除特殊字符
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // 移除重複的標點符號
    .replace(/([。！？；,，])\1+/g, '$1')
    .trim();
};

// 新增：內容質量評估函數
const assessContentQuality = (content: string): number => {
  if (!content || content.length < CONTENT_EXTRACTION_CONFIG.minContentLength) {
    return 0;
  }
  
  const words = content.split(/\s+/).filter(word => word.length > 1);
  if (words.length < CONTENT_EXTRACTION_CONFIG.minWordCount) {
    return 0.2;
  }
  
  // 檢查重複內容比例
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const duplicateRatio = 1 - (uniqueWords.size / words.length);
  
  if (duplicateRatio > CONTENT_EXTRACTION_CONFIG.maxDuplicateRatio) {
    return 0.3;
  }
  
  // 基於長度和結構給分
  let score = Math.min(content.length / 1000, 1) * 0.5; // 長度分數
  score += words.length > 100 ? 0.3 : words.length / 100 * 0.3; // 詞數分數
  score += content.includes('。') || content.includes('.') ? 0.2 : 0; // 句子結構分數
  
  return Math.min(score, 1);
};

// 優化後的 fetchUrlContent 函數
const fetchUrlContent = async (url: string) => {
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`正在抓取網址: ${url} ${retryCount > 0 ? `(重試 ${retryCount}/${maxRetries})` : ''}`);
      
      // 改善：添加更多請求頭來避免反爬
      const enhancedConfig = {
        ...AXIOS_CONFIG,
        headers: {
          ...AXIOS_CONFIG.headers,
          'Referer': 'https://www.google.com/',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'no-cache'
        }
      };
      
      const response = await axios.get(url, enhancedConfig);
      const html = response.data;
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // 提取網頁標題
      const title = document.querySelector('title')?.textContent?.trim() || '';
      
      // 改善：提取更多meta信息
      const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || 
                             document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
      
      const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      const canonicalUrl = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || url;

      // 改善：智能內容提取
      let bestContent = '';
      let bestScore = 0;
      
      for (const selector of CONTENT_EXTRACTION_CONFIG.primarySelectors) {
        const element = document.querySelector(selector);
        if (element) {
          // 克隆元素以避免修改原始DOM
          const clonedElement = element.cloneNode(true) as Element;
          
          // 移除不需要的元素
          CONTENT_EXTRACTION_CONFIG.removeSelectors.forEach(removeSelector => {
            const elementsToRemove = clonedElement.querySelectorAll(removeSelector);
            elementsToRemove.forEach(el => el.remove());
          });
          
          const rawContent = clonedElement.textContent?.trim() || '';
          const cleanedContent = cleanText(rawContent);
          const contentScore = assessContentQuality(cleanedContent);
          
          if (contentScore > bestScore && cleanedContent.length > 0) {
            bestContent = cleanedContent;
            bestScore = contentScore;
          }
        }
      }

      // 改善：提取結構化數據
      const structuredData = [];
      const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of ldJsonScripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          structuredData.push(data);
        } catch (e) {
          // 忽略解析錯誤
        }
      }

      // 改善：更好的鏈接處理
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(link => {
          const href = link.getAttribute('href');
          const text = link.textContent?.trim();
          return {
            text: text,
            href: href ? normalizeUrl(href, url) : href,
            isExternal: href ? !href.startsWith(new URL(url).origin) : false
          };
        })
        .filter(link => link.text && link.href && link.text.length > 2)
        .slice(0, CONFIG.MAX_LINKS);

      // 改善：更好的圖片處理
      const images = Array.from(document.querySelectorAll('img[src]'))
        .map(img => {
          const src = img.getAttribute('src');
          return {
            alt: img.getAttribute('alt') || '',
            src: src ? normalizeUrl(src, url) : src,
            width: img.getAttribute('width'),
            height: img.getAttribute('height')
          };
        })
        .filter(img => img.src)
        .slice(0, CONFIG.MAX_IMAGES);

      // 新增：提取聯絡信息
      const contactInfo = {
        emails: Array.from(html.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g))
          .map(match => match[0])
          .slice(0, 5),
        phones: Array.from(html.matchAll(/(\+?[\d\s\-\(\)]{8,15})/g))
          .map(match => match[0].trim())
          .filter(phone => /\d{4,}/.test(phone))
          .slice(0, 5)
      };

      const result = {
        url: url,
        canonicalUrl: canonicalUrl,
        title: title,
        ogTitle: ogTitle,
        metaDescription: metaDescription,
        metaKeywords: metaKeywords,
        content: bestContent.substring(0, CONFIG.MAX_CONTENT_LENGTH),
        contentQualityScore: bestScore,
        fullContentLength: bestContent.length,
        links: links,
        images: images,
        contactInfo: contactInfo,
        structuredData: structuredData.slice(0, 3), // 限制結構化數據數量
        timestamp: new Date().toISOString(),
        responseTime: response.headers['x-response-time'] || 'N/A',
        statusCode: response.status,
        language: document.documentElement.lang || 'unknown',
        charset: document.characterSet || 'UTF-8'
      };

      console.log(`成功抓取 ${url}，內容長度: ${bestContent.length} 字符，質量分數: ${bestScore.toFixed(2)}`);
      return result;

    } catch (error: any) {
      retryCount++;
      console.error(`抓取網址 ${url} 失敗 (嘗試 ${retryCount}/${maxRetries}):`, error.message);
      
      if (retryCount >= maxRetries) {
        return {
          url: url,
          error: `在 ${maxRetries} 次嘗試後失敗: ${error.message}`,
          title: '',
          content: '',
          contentQualityScore: 0,
          timestamp: new Date().toISOString(),
          retryCount: retryCount
        };
      }
      
      // 改善：更智能的重試策略
      const delay = Math.min(Math.pow(2, retryCount) * 1000, 10000); // 最大延遲10秒
      await sleep(delay);
    }
  }
};

const webSearch = async (query: string) => {
  try {
    // 檢查是否是URL
    const urlPattern = /^https?:\/\//i;
    if (urlPattern.test(query)) {
      return await fetchUrlContent(query);
    }
    
    // 如果不是URL，返回搜索建議
    return {
      query: query,
      suggestion: "請提供完整的網址以進行內容抓取",
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      query: query,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

const TOOL_MAP = {
  "web_search": webSearch,
  "fetch_url_content": (args: { url: string }) => fetchUrlContent(args.url)
};

export async function POST(request: NextRequest) {  
  try {
    const { input, systemPrompt } = await request.json();

    // Validate input
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid input provided' },
        { status: 400 }
      );
    }

    // Mock AI analysis based on input content
    const analysis = await beginEnhance(input, systemPrompt);

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function beginEnhance(input: string, systemPrompt?: string, urls?: string[]): Promise<string> {
  const client = new OpenAI({
    apiKey: CONFIG.KIMI_API_KEY,
    baseURL: CONFIG.API_BASE_URL,
  });

  let messages = [
    {
      role: "system",
      content: systemPrompt || SYSTEM_PROMPT,
    }
  ];

  messages = [
    ...messages,
    {
      role: "user",
      content: `以下是專家提供的個人介紹：${input}`,
    },
  ];

  if (urls && urls.length > 0) {
    messages.push({
      role: "user",
      content: `專家提供的網址連結：${urls.join(', ')}

        請立即執行以下步驟：
        1. 檢查專家提供的個人介紹，是否包含網址連結，如果有，請先記下所有網址
        2. 記下所有網址後，合併專家提供的網址連結和所記下的網址，檢查並避免重複的網址，然後使用 fetch_url_content 工具抓取每個網址的內容
        3. 分析抓取到的網站內容
        4. 按照要求的JSON格式返回分析結果

        現在開始抓取網址內容：`,
    });
  }

  let currentMessages = [...messages];
  let iteration = 0;
  let finalResult: any = {};

  while (iteration < CONFIG.MAX_ITERATIONS) {
    console.log(`\n=== 第 ${iteration + 1} 次API調用 ===`);
    const response = await client.chat.completions.create({
      model: CONFIG.MODEL,
      messages: currentMessages,
      temperature: CONFIG.TEMPERATURE,
      max_tokens: CONFIG.MAX_TOKENS,
      tools: TOOLS,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    const finishReason = choice.finish_reason;

    console.log(`Finish reason: ${finishReason}`);

    if (finishReason === "tool_calls") {
      // 將assistant的消息添加到上下文
      currentMessages.push(choice.message);
      
      // 處理工具調用
      for (const toolCall of choice.message.tool_calls || []) {
        const toolCallName = toolCall.function.name as keyof typeof TOOL_MAP;
        const toolCallArguments = JSON.parse(toolCall.function.arguments);
        
        console.log(`調用工具: ${toolCallName}，參數:`, toolCallArguments);

        let tool_result;
        if (TOOL_MAP[toolCallName]) {
          tool_result = await TOOL_MAP[toolCallName](toolCallArguments);
        } else {
          tool_result = { error: 'Tool not found' };
        }

        console.log(`工具結果摘要: ${JSON.stringify(tool_result).substring(0, 200)}...`);

        currentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolCallName,
          content: JSON.stringify(tool_result),
        });
      }
      
      iteration++;
    } else {
      // 獲得最終結果，要求JSON格式
      const finalMessages = [...currentMessages];
      finalMessages.push({
        role: "user",
        content: "請根據以上抓取到的網站內容，按照指定的JSON格式返回分析結果。請確保回應完整且JSON格式正確。"
      });
      
      const jsonResponse = await client.chat.completions.create({
        model: CONFIG.MODEL,
        messages: finalMessages as ChatCompletionMessageParam[],
        temperature: CONFIG.TEMPERATURE,
        max_tokens: CONFIG.MAX_TOKENS,
        response_format: {type: "json_object"}
      });
      
      finalResult = jsonResponse.choices[0].message.content;
      break;
    }
  }

  if (iteration >= CONFIG.MAX_ITERATIONS) {
    // If the maximum number of iterations is reached, make a final call
    console.log('\n=== 最終調用 ===');
    const finalResponse = await client.chat.completions.create({
      model: CONFIG.MODEL,
      messages: currentMessages,
      temperature: CONFIG.TEMPERATURE,
      max_tokens: CONFIG.MAX_TOKENS,
      tool_choice: "none",  // 最終調用不使用工具
      response_format: {type: "json_object"}  // 要求JSON格式輸出
    });
    finalResult = finalResponse.choices[0].message.content;
  }

  console.log('\n=== final Result ===');
  console.log(finalResult);
  
  // 新增：改進的錯誤處理
  try {
    if (!finalResult || finalResult.trim() === '') {
      throw new Error('Empty response from API');
    }
    
    const parsedResult = JSON.parse(finalResult);
    return JSON.stringify(parsedResult);
  } catch (parseError) {
    console.error('JSON解析失敗:', parseError);
    console.error('原始響應:', finalResult);
    
    // 嘗試修復截斷的JSON
    if (finalResult && typeof finalResult === 'string') {
      try {
        // 嘗試找到最後一個完整的JSON對象
        const lastBraceIndex = finalResult.lastIndexOf('}');
        if (lastBraceIndex > 0) {
          const trimmedResult = finalResult.substring(0, lastBraceIndex + 1);
          const recoveredResult = JSON.parse(trimmedResult);
          console.log('成功恢復截斷的JSON');
          return JSON.stringify(recoveredResult);
        }
      } catch (recoveryError) {
        console.error('JSON恢復失敗:', recoveryError);
      }
    }
    
    // 最後的fallback - 返回錯誤信息
    return JSON.stringify({
      error: "JSON解析失敗，可能因為響應被截斷",
      originalResponse: finalResult ? finalResult.substring(0, 500) + "..." : "空響應",
      suggestion: "請嘗試簡化輸入內容或增加max_tokens設置"
    });
  }
} 