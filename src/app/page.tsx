"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthUtils } from "@/lib/auth";
import AuthGuard from "@/components/AuthGuard";
import { SYSTEM_PROMPT } from "@/app/api/enhance/data";

type OutputType =
  | {
      description: {
        zh: string;
        en: string;
      };
      serviceDetail: {
        zh: string[];
        en: string[];
      };
      priceItems: {
        name: string;
        description: string;
        price: number;
        priceUnit: string;
      }[];
      address: string;
      openTime: string;
      explanation: string;
    }
  | string;

export default function Home() {
  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT); // 使用 SYSTEM_PROMPT 作为默认值
  const [output, setOutput] = useState<OutputType>({
    description: {
      zh: "教練聯盟堅拒不良銷售，更重視服務質素，以及與學員間的溝通。我們的專業團隊包括香港健美界地位崇高的港隊健美運動員和具不同運動學位，專項訓練，運動創傷及伸展治療的資深教練組成。根據各學員的需要度身制訂個人的健體計劃以達成目標。教練聯盟不受會藉約束，彈性的時間地點，更切合現今繁忙而又重視健康的都市人。我們的課程在10區總店統籌和監控，確保以高質素和最專業運作課程給學員達到效果。",
      en: "Asian Alliance prioritizes service quality and communication with our members over aggressive sales tactics. Our professional team includes esteemed Hong Kong bodybuilders and experienced coaches with various sports degrees, specializing in training, sports injuries, and stretching therapy. We tailor personal fitness plans to meet each member's needs and achieve their goals. With flexible timing and locations, we cater to the busy urbanites who value health. Our courses are coordinated and monitored by our main store across 10 districts to ensure high-quality and professional operation for our members.",
    },
    serviceDetail: {
      zh: [
        "私人健身教練服務",
        "專業運動創傷及伸展治療",
        "根據學員需要度身定制的健體計劃",
      ],
      en: [
        "Personal fitness coaching",
        "Professional sports injury and stretching therapy",
        "Tailored fitness plans based on individual needs",
      ],
    },
    priceItems: [
      {
        name: "一個月體驗課程",
        description: "提供4堂課程，試堂費用$100。",
        price: 1600,
        priceUnit: "",
      },
    ],
    address:
      "【港島區：中環、銅鑼灣 、天后】【九龍區：尖沙咀 、佐敦、黃埔、觀塘】【新界區：荃灣 、元朗 、屯門】",
    openTime: "具體時間未在網站內提及",
    explanation:
      "教練聯盟提供高質素的私人健身教練服務，擁有專業的教練團隊，包括港隊健美運動員和資深教練。我們的服務不受會藉約束，提供彈性的時間和地點，以滿足繁忙都市人的健身需求。我們在10區設有總店，統籌和監控課程質素，確保學員能達到最佳效果。歡迎預約及查詢更多課程詳情。",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const router = useRouter();

  const handleLogout = () => {
    AuthUtils.logout();
    router.push("/login");
  };

  const handleAIMagic = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    // Clear previous output
    setOutput("");
    setActiveTab("description");

    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input,
          systemPrompt, // 同时发送系统提示
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze profile");
      }

      // 解析 API 返回的分析结果
      const parsedResult = JSON.parse(data.analysis);

      // 检查解析结果是否包含错误
      if (parsedResult.error) {
        setOutput(`❌ **AI 分析处理错误**

处理您的配置文件时出现问题，请重试。

**错误详情:**
${parsedResult.error}

**建议解决方案:**
${
  parsedResult.suggestion ||
  "• 检查网络连接\n• 确认输入内容格式正确\n• 稍后重试"
}

**原始响应预览:**
${parsedResult.originalResponse || "无详细信息"}

**故障排除提示:**
• 如果是网络超时，请稍后重试
• 确保输入的网址可以正常访问
• 尝试减少输入内容的长度
• 如问题持续，请联系技术支持`);
      } else {
        // 正常情况下设置输出
        setOutput(parsedResult);
      }
    } catch (error) {
      console.error("Error calling API:", error);
      setOutput(`❌ **请求处理错误**

处理您的配置文件时发生错误，请重试。

**错误详情:**
${error instanceof Error ? error.message : "未知错误"}

**故障排除提示:**
• 检查网络连接
• 确保输入内容不为空
• 刷新页面后重新提交
• 如问题持续，请联系技术支持`);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: "description", name: "Description", icon: "📝" },
    { id: "serviceDetail", name: "Service Detail", icon: "🔤" },
    { id: "priceItems", name: "Price Items", icon: "💰" },
  ];

  const tabs2 = [
    { id: "info", name: "Information", icon: "🏠" },
    { id: "explanation", name: "Explanation", icon: "📝" },
  ];

  const renderTabContent = () => {
    if (typeof output === "string") {
      return (
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
            {output}
          </pre>
        </div>
      );
    }

    if (Object.keys(output).length === 0) return null;

    switch (activeTab) {
      case "description":
        return (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Chinese Description
              </h4>
              <pre className="whitespace-pre-wrap break-words">
                <p className="text-slate-700 dark:text-slate-300">
                  {output.description.zh}
                </p>
              </pre>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                English Description
              </h4>
              <pre className="whitespace-pre-wrap break-words">
                <p className="text-slate-700 dark:text-slate-300">
                  {output.description.en}
                </p>
              </pre>
            </div>
          </div>
        );
      case "serviceDetail":
        return (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                Chinese Service Details
              </h4>
              <div className="flex flex-wrap gap-2">
                {output.serviceDetail.zh.map((keyword, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                English Service Details
              </h4>
              <div className="flex flex-wrap gap-2">
                {output.serviceDetail.en.map((keyword, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      case "priceItems":
        return (
          <div className="space-y-6">
            {output.priceItems.map((item, index) => (
              <div
                key={index}
                className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600"
              >
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    {item.name}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    {item.description}
                  </p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {item.price ? `$${item.price}` : ""} {item.priceUnit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        );
      case "info":
        return (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Address
              </h4>
              <pre className="whitespace-pre-wrap break-words">
                <p className="text-slate-700 dark:text-slate-300">
                  {output.address}
                </p>
              </pre>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Open Time
              </h4>
              <pre className="whitespace-pre-wrap break-words">
                <p className="text-slate-700 dark:text-slate-300">
                  {output.openTime}
                </p>
              </pre>
            </div>
          </div>
        );
      case "explanation":
        return (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Explanation
              </h4>
              <pre className="whitespace-pre-wrap break-words">
                <p className="text-slate-700 dark:text-slate-300">
                  {output.explanation}
                </p>
              </pre>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12 relative">
            {/* Navigation buttons */}
            <div className="absolute top-0 right-0 flex space-x-3">
              <button
                onClick={() => router.push("/search")}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <span>🔍</span>
                <span>搜索</span>
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </div>

            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Profile AI
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Transform your profile with AI-powered insights and
              recommendations. Get personalized analysis to enhance your
              professional presence.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Welcome, Administrator! You have successfully logged in.
            </p>
          </div>

          {/* Main Content */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Input Section */}
            <div className="space-y-6">
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <span className="mr-3 text-2xl">📝</span>
                  Your Profile
                </h2>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste the profile details here, along with all related social media links or personal websites"
                  className="w-full h-64 p-4 border border-slate-200 dark:border-slate-600 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-white/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                />
                <div className="mt-4 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                  <span>{input.length} characters</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    Min. 50 characters recommended
                  </span>
                </div>
              </div>
            </div>

            {/* Output Section */}
            <div className="space-y-6">
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <span className="mr-3 text-2xl">🤖</span>
                  Curated Profile Details
                </h2>
                {output && typeof output === "object" ? (
                  <div className="space-y-4">
                    {/* Tabs Navigation */}
                    <div className="border-b border-slate-200 dark:border-slate-600">
                      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {tabs.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                              activeTab === tab.id
                                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300"
                            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200`}
                            aria-current={
                              activeTab === tab.id ? "page" : undefined
                            }
                          >
                            <span>{tab.icon}</span>
                            <span>{tab.name}</span>
                          </button>
                        ))}
                      </nav>
                      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {tabs2.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                              activeTab === tab.id
                                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300"
                            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200`}
                            aria-current={
                              activeTab === tab.id ? "page" : undefined
                            }
                          >
                            <span>{tab.icon}</span>
                            <span>{tab.name}</span>
                          </button>
                        ))}
                      </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-64 max-h-96 overflow-y-auto">
                      {renderTabContent()}
                    </div>
                  </div>
                ) : output ? (
                  <div className="min-h-64 max-h-96 overflow-y-auto">
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                        {output}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500">
                    <div className="text-center">
                      <div className="text-4xl mb-4">🎯</div>
                      <p className="text-lg font-medium mb-2">
                        Ready for AI Extraction?
                      </p>
                      <p className="text-sm">
                        Enter your profile details and click &ldquo;AI
                        Extraction&rdquo; to get curated insights
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Features */}
              {/* <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                <div className="text-2xl mb-2">⚡</div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Fast Analysis
                </p>
              </div>
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                <div className="text-2xl mb-2">🎨</div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Personalized
                </p>
              </div>
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                <div className="text-2xl mb-2">🔒</div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Secure
                </p>
              </div>
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                <div className="text-2xl mb-2">📈</div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Actionable
                </p>
              </div>
            </div> */}
            </div>
          </div>
          {/* SystemPrompt */}
          <div className="mt-8">
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <span className="mr-3 text-2xl">🤖</span>
                System Prompt
              </h2>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="输入系统提示词来指导AI如何分析配置文件..."
                className="w-full h-64 p-4 border border-slate-200 dark:border-slate-600 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-white/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          {/* AI Magic Button */}
          <button
            onClick={handleAIMagic}
            disabled={!input.trim() || !systemPrompt.trim() || isLoading}
            className="w-full mt-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>AI Processing...</span>
              </>
            ) : (
              <>
                <span className="text-xl">✨</span>
                <span>AI Extraction</span>
                <span className="text-xl">🚀</span>
              </>
            )}
          </button>

          {/* Footer */}
          <footer className="text-center mt-16 py-8 border-t border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400">
              Powered by{" "}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                Kimi AI
              </span>{" "}
              • Enhancing profiles with artificial intelligence
            </p>
          </footer>
        </div>
      </div>
    </AuthGuard>
  );
}
