import { NextRequest, NextResponse } from 'next/server';
import { ProfileType } from '@/types/profile';
import { generateEmbeddingsWithOpenAI, storeEmbeddings } from '@/lib/pinecone';

type DescriptionJsonType = {
  children: {
    text: string;
  }[];
}[];

const cleanText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ')  // 將多個空白字符（包括換行符）替換為單個空格
    .replace(/[\u200B-\u200D\uFEFF]/g, '')  // 移除特殊字符
    .replace(/([。！？；,，])\1+/g, '$1')   // 移除重複標點
    .trim();
};

const vectorProfileText = (profile: ProfileType) => {
  let profileDescription = profile.description || '';
  if (profile.descriptionFormat === 'JSON') {
    try {
      const descriptionJson = JSON.parse(profile.description) as DescriptionJsonType;
      profileDescription = '';
      profileDescription = descriptionJson.map((item) => {
        if (Array.isArray(item.children)) {
          const itemText = item.children.map((child) => child.text || '').filter(Boolean).join(' ');
          return itemText;
        }
        return null;
      }).filter(Boolean).join(' ');
    } catch (error) {
      console.error('Error parsing description JSON:', error);
    }
  }

  profileDescription = cleanText(profileDescription);

  const occupations = Array.isArray(profile.occupationLabels) ? profile.occupationLabels.join(', ') : '';
  const categories = Array.isArray(profile.cateogryLabels) ? profile.cateogryLabels.join(', ') : '';
  const serviceDistricts = Array.isArray(profile.districtNames) ? profile.districtNames.join(', ') : '';
  const serviceDetail = Array.isArray(profile.serviceDetail) ? profile.serviceDetail.join(' | ') : '';

  const reviewsText = Array.isArray(profile.reviews) ? 
    profile.reviews.map(review => '評分: ' + review.rate + '/5 評論: ' + review.review.trim()).join(' ') : '';

  return `檔案名稱: ${profile.name} 專家介紹: ${profileDescription} 職業: ${occupations} 類別: ${categories} 服務地區: ${serviceDistricts} 服務明細: ${cleanText(serviceDetail)} 評論: ${cleanText(reviewsText)}`;
};

// POST /api/profile/import
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profiles } = body;

    const validProfiles: ProfileType[] = profiles.filter((profile: ProfileType) => {
      return !!profile.id && profile.status === 'ON';
    });

    if (validProfiles.length === 0) {
      return NextResponse.json({ error: 'No valid profiles' }, { status: 400 });
    }

    let data = validProfiles.map((profile) => {
      return {
        id: `profile-${profile.id}`,
        category: (profile.categories || []).join(','),
        text: cleanText(vectorProfileText(profile)),
        district: profile.districtNames,
        metadata: {
          id: profile.id,
          category: (profile.categories || []).join(','),
        },
        values: [] as number[],
      };
    });

    // Start Embedding
    const embeddings = await generateEmbeddingsWithOpenAI(data.map(d => d.text));
    data = data.map((item, index) => {
      return {
        ...item,
        values: embeddings[index],
      };
    });

    // Store Embeddings
    const count = await storeEmbeddings(data);
    
    return NextResponse.json({ success: true, data, count });
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 });
  }
}
