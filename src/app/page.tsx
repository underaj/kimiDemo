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
      keyboards: {
        zh: string[];
        en: string[];
      };
      priceItems: {
        name: string;
        description: string;
        price: number;
        priceUnit: string;
      }[];
      story: {
        zh: string;
        en: string;
      };
      explaination: string;
    }
  | string;

export default function Home() {
  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT); // 使用 SYSTEM_PROMPT 作为默认值
  const [output, setOutput] = useState<OutputType>("");
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
    { id: "keyboards", name: "Keywords", icon: "🔤" },
    { id: "priceItems", name: "Price Items", icon: "💰" },
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
      case "keyboards":
        return (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                Chinese Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {output.keyboards.zh.map((keyword, index) => (
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
                English Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {output.keyboards.en.map((keyword, index) => (
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
            {/* Logout button */}
            <div className="absolute top-0 right-0">
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
