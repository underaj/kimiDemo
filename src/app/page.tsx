'use client';

import { useState } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAIMagic = async () => {
    if (!input.trim()) return;
    
    setIsLoading(true);
    setOutput(''); // Clear previous output
    
    try {
      const response = await fetch('/api/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze profile');
      }

      setOutput(data.analysis);
    } catch (error) {
      console.error('Error calling API:', error);
      setOutput(`❌ **Error Processing Request**

Sorry, there was an error processing your profile. Please try again.

**Error Details:**
${error instanceof Error ? error.message : 'Unknown error occurred'}

**Troubleshooting Tips:**
• Check your internet connection
• Ensure your input is not empty
• Try refreshing the page and submitting again
• Contact support if the issue persists`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Profile AI
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Transform your profile with AI-powered insights and recommendations. 
            Get personalized analysis to enhance your professional presence.
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
                <span className="text-blue-600 dark:text-blue-400">Min. 50 characters recommended</span>
              </div>
            </div>

            {/* AI Magic Button */}
            <button
              onClick={handleAIMagic}
              disabled={!input.trim() || isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
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
          </div>

          {/* Output Section */}
          <div className="space-y-6">
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
              <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <span className="mr-3 text-2xl">🤖</span>
                Curated Profile Details
              </h2>
              <div className="min-h-64 max-h-96 overflow-y-auto">
                {output ? (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                      {output}
                    </pre>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500">
                    <div className="text-center">
                      <div className="text-4xl mb-4">🎯</div>
                      <p className="text-lg font-medium mb-2">Ready for AI Extraction?</p>
                                             <p className="text-sm">Enter your profile details and click "AI Extraction" to get curated insights</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                <div className="text-2xl mb-2">⚡</div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Fast Analysis</p>
              </div>
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                <div className="text-2xl mb-2">🎨</div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Personalized</p>
              </div>
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                <div className="text-2xl mb-2">🔒</div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Secure</p>
              </div>
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                <div className="text-2xl mb-2">📈</div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Actionable</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 py-8 border-t border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">
            Powered by <span className="font-semibold text-blue-600 dark:text-blue-400">Kimi AI</span> • 
            Enhancing profiles with artificial intelligence
          </p>
        </footer>
      </div>
    </div>
  );
}
