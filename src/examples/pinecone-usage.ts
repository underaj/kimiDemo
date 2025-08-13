// 示例：如何在其他文件中使用 Pinecone 工具
import { 
  storeEmbeddings, 
  searchSimilar, 
  DataItem,
  getIndexStats,
  deleteVectorsByPrefix 
} from '@/lib/pinecone';

// 示例 1: 存储新的教育数据
export const storeEducationData = async () => {
  const educationData: DataItem[] = [
    {
      label: '高中物理',
      description: '高中物理课程，包含力学、热学、电学等内容',
      category: 'high_school_physics'
    },
    {
      label: '大学微积分',
      description: '大学数学微积分课程，学习极限、导数、积分',
      category: 'university_math'
    },
    {
      label: '日语入门',
      description: '日语基础课程，学习五十音图和基本语法',
      category: 'language_learning'
    }
  ];

  try {
    const storedCount = await storeEmbeddings(educationData);
    console.log(`成功存储 ${storedCount} 个教育数据项`);
    return storedCount;
  } catch (error) {
    console.error('存储失败:', error);
    throw error;
  }
};

// 示例 2: 搜索相似课程
export const findSimilarCourses = async (userQuery: string) => {
  try {
    const results = await searchSimilar(userQuery, 5);
    
    console.log(`查询: "${userQuery}"`);
    console.log('找到的相似课程:');
    
    results.forEach((match, index) => {
      console.log(`${index + 1}. ${match.metadata?.label} (相似度: ${match.score?.toFixed(3)})`);
      console.log(`   描述: ${match.metadata?.description}`);
      console.log(`   类别: ${match.metadata?.category}\n`);
    });
    
    return results;
  } catch (error) {
    console.error('搜索失败:', error);
    throw error;
  }
};

// 示例 3: 获取索引统计信息
export const getVectorStats = async () => {
  try {
    const stats = await getIndexStats();
    console.log('Pinecone 索引统计:');
    console.log(`总记录数: ${stats.totalRecordCount}`);
    console.log(`索引维度: ${stats.dimension}`);
    return stats;
  } catch (error) {
    console.error('获取统计信息失败:', error);
    throw error;
  }
};

// 示例 4: 清理旧数据
export const cleanupOldVectors = async (prefix: string) => {
  try {
    await deleteVectorsByPrefix(prefix);
    console.log(`成功删除前缀为 "${prefix}" 的向量`);
  } catch (error) {
    console.error('删除失败:', error);
    throw error;
  }
};

// 示例 5: 完整的工作流程
export const completeWorkflow = async () => {
  try {
    console.log('=== Pinecone 完整工作流程示例 ===\n');
    
    // 1. 存储数据
    console.log('1. 存储教育数据...');
    await storeEducationData();
    
    // 2. 等待一段时间确保数据已索引
    console.log('2. 等待数据索引...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. 搜索相似内容
    console.log('3. 搜索相似课程...');
    await findSimilarCourses('我想学习数学');
    await findSimilarCourses('物理补习');
    
    // 4. 获取统计信息
    console.log('4. 获取索引统计...');
    await getVectorStats();
    
    console.log('=== 工作流程完成 ===');
  } catch (error) {
    console.error('工作流程失败:', error);
  }
}; 