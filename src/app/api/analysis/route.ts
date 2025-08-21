import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { EXPAND_QUERY_PROMPT, SYSTEM_PROMPT } from './data';
import categories from './categories.json';
import { searchSimilar, callGPT, setModelId } from '@/lib/pinecone';
import { ProfileType } from '@/types/profile';
import { AIMessageType } from '@/types/common';
import { OPENAI_MODEL_ID } from '@/constants';

export async function POST(request: NextRequest) {
  try {
    const receivedData = await request.json();
    const { query, localeId = 'zh-hk', expandPrompt, systemPrompt, model } = receivedData;
    
    setModelId(model);

    const messages: AIMessageType[] = [
      {
        role: "system",
        content: systemPrompt || SYSTEM_PROMPT,
      },
      {
        role: "system",
        content: `以下是系統的類別列表：${JSON.stringify(categories)}`,
      },
      {
        role: "user",
        content: `以下是用戶輸入的內容：${query}`,
      }
    ];

    const currentMessages = [...messages];

    const findCategoryResult = await callGPT(currentMessages);

    if (!findCategoryResult) {
      return NextResponse.json({ error: "No response from the model" }, { status: 500 });
    }

    let matchedCategories;
    try {
      matchedCategories = JSON.parse(findCategoryResult.message.content);
    } catch (error) {
      return NextResponse.json({ error: findCategoryResult.message.content }, { status: 500 });
    }

    if (!Array.isArray(matchedCategories) || matchedCategories.length === 0) {
      return NextResponse.json({ error: "No matched categories" }, { status: 500 });
    }

    const { searchProfileResults, expandedQueries } = await searchSimilar<{
      category: string;
      id: string;
    }>(query, 60, expandPrompt || EXPAND_QUERY_PROMPT);

    const finalResults: any = {};
    const validProfileIds: string[] = [];

    matchedCategories.forEach(category => {
      finalResults[category.categoryId] = [];
    });

    if (searchProfileResults.length > 0) {
      for (const result of searchProfileResults) {
        const profileCategories = result.metadata?.category?.split(',') || [];
        for (const profileCategory of profileCategories) {
          if (finalResults[profileCategory] && result.metadata?.id) {
            if (!validProfileIds.includes(result.metadata.id)) {
              validProfileIds.push(result.metadata.id);
            }
            finalResults[profileCategory].push(result.metadata.id);
          }
        }
      }

      const profilesData = await axios.get('https://api.hellotoby.com/api/supplierdetails/', {
        headers: {
          'X-HT-Locale': localeId,
        },
        params: {
          supplierId: validProfileIds,
          withTopReview: true,
        },
        paramsSerializer: {
          indexes: null,
        },
      });

      if (!Array.isArray(profilesData.data.data) || profilesData.data.data.length === 0) {
        return NextResponse.json({ error: `No profile found` }, { status: 200 });
      }

      Object.keys(finalResults).forEach(category => {
        finalResults[category] = finalResults[category].map((id: string) => {
          const supplier = profilesData.data.data.find((supplier: ProfileType) => supplier.id === id);
          return supplier;
        }).filter(Boolean);
      });
    }

    Object.keys(finalResults).forEach(category => {
      if (!Array.isArray(finalResults[category]) || finalResults[category].length === 0) {
        delete finalResults[category];
      }
    });

    return NextResponse.json({
      success: true,
      finalResults,
      matchedCategories,
      searchProfileResults,
      expandedQueries,
    });
    
  } catch (error) {
    return NextResponse.json({ error: `处理失败: ${error}` }, { status: 500 });
  }
}
