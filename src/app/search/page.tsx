"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthUtils } from "@/lib/auth";
import AuthGuard from "@/components/AuthGuard";
import { ProfileType } from "@/types/profile";
import { EXPAND_QUERY_PROMPT, SYSTEM_PROMPT } from "@/app/api/analysis/data";

type SearchResult = {
  [categoryId: string]: ProfileType[];
};

type SearchCategoryResult = {
  categoryId: string;
  label: string;
}[];

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchCategoryResult, setSearchCategoryResult] =
    useState<SearchCategoryResult>([]);
  const [searchResults, setSearchResults] = useState<SearchResult>({});
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT);
  const [expandPrompt, setExpandPrompt] = useState(EXPAND_QUERY_PROMPT);
  const [activePromptTab, setActivePromptTab] = useState("system"); // 添加标签页状态
  const router = useRouter();

  // 添加分析函数 - 发送到 /api/analysis
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setSearchError("");

      // 发送 searchQuery 到 analysis API
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          systemPrompt,
          expandPrompt,
        }),
      });

      const data = await response.json();
      setIsSearching(false);

      if (data.error) {
        onError(data.error);
        return;
      }

      if (data.success) {
        console.log("分析结果:", data);
        const matchedCategories = data.matchedCategories ?? [];
        const finalResults = data.finalResults ?? {};

        setSearchCategoryResult(matchedCategories);
        setSearchResults(finalResults);

        // 检查是否有搜索结果
        const hasResults =
          Object.keys(finalResults).length > 0 &&
          Object.values(finalResults).some(
            (profiles: any) => Array.isArray(profiles) && profiles.length > 0
          );

        if (!hasResults) {
          // 设置一个特殊的错误状态来显示无结果消息
          setSearchError(
            "Sorry, no service providers were found matching your search criteria. Please try using different keywords or broadening your search scope."
          );
          setSearchCategoryResult([]);
          setSearchResults({});
          return;
        }

        const firstCategory = Object.keys(finalResults)[0];
        if (firstCategory) {
          setSelectedCategory(firstCategory);
        }
      }
    } catch (error: unknown) {
      console.error("分析错误:", error);
      const errorMessage =
        error instanceof Error ? error.message : "搜索出現錯誤";
      onError(errorMessage);
    }
  };

  const handleLogout = () => {
    AuthUtils.logout();
    router.push("/login");
  };

  const onError = (error: string) => {
    setSearchError(error);
    setIsSearching(false);
    setSearchCategoryResult([]);
    setSearchResults({});
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults({});
    setSearchCategoryResult([]);
    setSearchError("");
    setSelectedCategory("");
  };

  // 獲取標籤顯示名稱的函數
  const getCategoryLabel = (categoryId: string): string => {
    const found = searchCategoryResult.find(
      (item) => item.categoryId === categoryId
    );
    return found ? found.label : categoryId;
  };

  // 獲取當前選中分類的結果
  const getCurrentCategoryResults = (): ProfileType[] => {
    if (!selectedCategory || !searchResults[selectedCategory]) {
      return [];
    }
    return searchResults[selectedCategory];
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push("/")}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  ← Back
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                  Search Page
                </h1>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Side - Search Content and Results */}
            <div className="lg:col-span-2 space-y-8">
              {/* Search Form */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <form onSubmit={handleSearch} className="space-y-4">
                  <div>
                    <label
                      htmlFor="search"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Search Content
                    </label>
                    <textarea
                      id="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter your search content..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-vertical"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isSearching || !searchQuery.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center gap-2"
                    >
                      {isSearching ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Searching...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                          Start Search
                        </>
                      )}
                    </button>

                    {(searchQuery || Object.keys(searchResults).length > 0) && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        disabled={isSearching}
                        className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-md font-medium transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </form>

                {/* Search Error */}
                {searchError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Search Error
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          {searchError}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Search Results */}
              {!isSearching && (
                <>
                  {Object.keys(searchResults).length > 0 ? (
                    <div className="bg-white rounded-lg shadow-md">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                          Search Results
                        </h2>
                      </div>

                      {/* Category Tags */}
                      <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex flex-wrap gap-2">
                          {Object.keys(searchResults).map((categoryId) => (
                            <button
                              key={categoryId}
                              onClick={() => setSelectedCategory(categoryId)}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                selectedCategory === categoryId
                                  ? "bg-indigo-600 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              {getCategoryLabel(categoryId)} (
                              {searchResults[categoryId]?.length || 0})
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Results Display */}
                      {selectedCategory && (
                        <div className="divide-y divide-gray-200">
                          {getCurrentCategoryResults().map((profile) => (
                            <div
                              key={profile.id}
                              className="p-6 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-start gap-4">
                                {/* Profile Image */}
                                {profile.logoUrl && (
                                  <div className="flex-shrink-0">
                                    <img
                                      src={profile.logoUrl}
                                      alt={profile.name}
                                      className="w-16 h-16 rounded-lg object-cover"
                                    />
                                  </div>
                                )}

                                {/* Profile Info */}
                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h3 className="text-lg font-semibold text-gray-900">
                                        {profile.name}
                                      </h3>
                                      {profile.subTitle && (
                                        <p className="text-sm text-gray-600 mt-1">
                                          {profile.subTitle}
                                        </p>
                                      )}
                                    </div>

                                    {/* Rating and Stats */}
                                    <div className="text-right">
                                      {profile.rate > 0 && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-yellow-400">
                                            ★
                                          </span>
                                          <span className="font-semibold">
                                            {profile.rate}
                                          </span>
                                        </div>
                                      )}
                                      <div className="text-sm text-gray-500 mt-1">
                                        {profile.hiredTimes || 0} times hired
                                      </div>
                                    </div>
                                  </div>

                                  {/* Address and Districts */}
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                    {profile.address && (
                                      <span className="bg-gray-100 px-2 py-1 rounded">
                                        📍 {profile.address}
                                      </span>
                                    )}
                                    {profile.districtNames &&
                                      profile.districtNames.length > 0 && (
                                        <span className="bg-blue-100 px-2 py-1 rounded text-blue-700">
                                          Service Areas:{" "}
                                          {profile.districtNames.join(", ")}
                                        </span>
                                      )}
                                  </div>

                                  {/* Business Info */}
                                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                                    {profile.businessYears && (
                                      <span>
                                        Experience: {profile.businessYears}{" "}
                                        years
                                      </span>
                                    )}
                                    {profile.openTime && (
                                      <span>
                                        Business Hours: {profile.openTime}
                                      </span>
                                    )}
                                  </div>

                                  {/* Medals */}
                                  {profile.medals &&
                                    profile.medals.length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {profile.medals.map((medal, index) => (
                                          <div
                                            key={index}
                                            className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded text-xs"
                                            title={medal.tip}
                                          >
                                            <img
                                              src={medal.icon}
                                              alt={medal.name}
                                              className="w-4 h-4"
                                            />
                                            <span className="text-yellow-700">
                                              {medal.name}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                  {/* Action Buttons */}
                                  <div className="mt-4 flex gap-2">
                                    <a
                                      href={`https://www.hellotoby.com/zh-hk/hire-pro/${getCategoryLabel(
                                        selectedCategory
                                      )}/${profile.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors inline-block"
                                    >
                                      View Details
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* No Category Selected Message */}
                      {Object.keys(searchResults).length > 0 &&
                        !selectedCategory && (
                          <div className="p-8 text-center text-gray-500">
                            <p>
                              Please select a category tag above to view related
                              results
                            </p>
                          </div>
                        )}
                    </div>
                  ) : (
                    searchQuery &&
                    !searchError && (
                      // 新增：搜索完成但无结果的情况
                      <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <svg
                          className="mx-auto h-16 w-16 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.220 0-4.240-.513-6.072-1.422C7.222 14.477 8.477 15 10 15h2zm2 5.291A7.962 7.962 0 0112 21a7.962 7.962 0 01-6-2.709m12 0A7.962 7.962 0 0018 21a7.962 7.962 0 006-2.709m-6 2.709a7.962 7.962 0 01-6-2.709"
                          />
                        </svg>
                        <h3 className="mt-4 text-xl font-semibold text-gray-900">
                          未找到相关结果
                        </h3>
                        <p className="mt-2 text-gray-600 max-w-md mx-auto">
                          很抱歉，没有找到符合您搜索条件的服务提供者。请尝试：
                        </p>
                        <ul className="mt-4 text-sm text-gray-500 space-y-1">
                          <li>• 使用不同的关键词</li>
                          <li>• 简化搜索内容</li>
                          <li>• 尝试更通用的描述</li>
                        </ul>
                      </div>
                    )
                  )}
                </>
              )}

              {/* Welcome Message */}
              {!searchQuery && Object.keys(searchResults).length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <svg
                    className="mx-auto h-16 w-16 text-indigo-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <h3 className="mt-4 text-xl font-semibold text-gray-900">
                    Welcome to Search
                  </h3>
                  <p className="mt-2 text-gray-600 max-w-md mx-auto">
                    Enter your search content in the input box above, and we
                    will find the most relevant results for you.
                  </p>
                </div>
              )}
            </div>

            {/* Right Side - Prompt Tabs */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md sticky top-8">
                <div className="p-6 pb-0">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-3 text-xl">🤖</span>
                    Prompt Config
                  </h2>

                  {/* Tab Navigation */}
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                      <button
                        onClick={() => setActivePromptTab("system")}
                        className={`${
                          activePromptTab === "system"
                            ? "border-indigo-500 text-indigo-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200`}
                      >
                        <span>🎯</span>
                        <span>System Prompt</span>
                      </button>
                      <button
                        onClick={() => setActivePromptTab("expand")}
                        className={`${
                          activePromptTab === "expand"
                            ? "border-indigo-500 text-indigo-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200`}
                      >
                        <span>🔍</span>
                        <span>Expand Prompt</span>
                      </button>
                    </nav>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-6 pt-4">
                  {activePromptTab === "system" ? (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Prompt
                      </label>
                      <textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder="輸入系統提示詞來指導AI如何分析搜索內容..."
                        className="w-full h-80 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 bg-gray-50 text-gray-700 placeholder-gray-400 text-sm"
                      />
                      <div className="text-sm text-gray-500">
                        <span>{systemPrompt.length} 個字符</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Prompt
                      </label>
                      <textarea
                        value={expandPrompt}
                        onChange={(e) => setExpandPrompt(e.target.value)}
                        placeholder="輸入擴展提示詞來指導AI如何擴展搜索查詢..."
                        className="w-full h-80 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 bg-gray-50 text-gray-700 placeholder-gray-400 text-sm"
                      />
                      <div className="text-sm text-gray-500">
                        <span>{expandPrompt.length} 個字符</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
