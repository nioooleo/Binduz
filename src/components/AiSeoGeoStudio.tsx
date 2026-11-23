import {
  Activity,
  Bot,
  CheckCircle2,
  ExternalLink,
  FileCode2,
  Globe,
  Search,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNewspaper } from '../contexts/NewspaperContext';
import { auth } from '../lib/firebase';

interface SeoPreviewBundle {
  baseUrl: string;
  robotsTxt: string;
  llmsTxt: string;
  sitemapXml: string;
  newsSitemapXml: string;
}

interface AiOptimizationResult {
  seoTitle: string;
  seoDescription: string;
  focusKeywords: string[];
  entities: string[];
  aiSummary: string;
  faqPairs: Array<{ question: string; answer: string }>;
  geoRecommendations: string[];
  discoverReadinessScore: number;
}

export function AiSeoGeoStudio() {
  const { articles, saveArticle, webVitals, user, adminToken, isStaffAuthenticated, pushToast } = useNewspaper();
  const [selectedArticleId, setSelectedArticleId] = useState<string>(articles[0]?.id || '');
  const [previewBundle, setPreviewBundle] = useState<SeoPreviewBundle | null>(null);
  const [activeFileTab, setActiveFileTab] = useState<'llms' | 'robots' | 'sitemap' | 'news'>('llms');
  const [optimizing, setOptimizing] = useState(false);
  const [aiResult, setAiResult] = useState<AiOptimizationResult | null>(null);

  useEffect(() => {
    fetch('/api/public/seo-preview')
      .then((r) => r.json())
      .then(setPreviewBundle)
      .catch(() => {});
  }, []);

  const targetArticle = articles.find((a) => a.id === selectedArticleId) || articles[0];

  const handleRunOptimizer = async () => {
    if (!targetArticle) return;
    if (!isStaffAuthenticated && !user) {
      pushToast('Staff Login Required', 'Sign in via Staff Portal or Google Account to run AI SEO & GEO.');
      return;
    }
    setOptimizing(true);
    try {
      const token = adminToken || (await auth.currentUser?.getIdToken());
      const resp = await fetch('/api/ai/optimize-seo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: targetArticle.title,
          excerpt: targetArticle.excerpt,
          content: targetArticle.content,
          category: targetArticle.category,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Optimization failed.');
      setAiResult(data);
      pushToast('AI GEO Complete', `Discover Readiness Score: ${data.discoverReadinessScore}/100`);
    } catch (err) {
      pushToast('AI SEO Notice', err instanceof Error ? err.message : 'Unable to optimize article.');
    } finally {
      setOptimizing(false);
    }
  };

  const handleApplyToArticle = async () => {
    if (!targetArticle || !aiResult) return;
    await saveArticle({
      ...targetArticle,
      seoTitle: aiResult.seoTitle,
      seoDescription: aiResult.seoDescription,
      focusKeywords: aiResult.focusKeywords,
      aiSummary: aiResult.aiSummary,
    });
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#0D47FF] dark:text-sky-400 font-bold">
            Technical SEO · Google News · Generative Engine Optimization
          </span>
          <h2 className="font-display text-3xl font-bold text-neutral-900 dark:text-white mt-1">
            AI Search & Discover Visibility Command
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <a
            href="/llms.txt"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded hover:border-[#0D47FF]"
          >
            <span>/llms.txt</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="/news-sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded hover:border-[#0D47FF]"
          >
            <span>/news-sitemap.xml</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Top Grid: AI Engine Readiness + Core Web Vitals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Answer Engine Crawler Matrix */}
        <div className="lg:col-span-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-6">
          <div className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white mb-4">
            <Bot className="w-4 h-4 text-[#0D47FF]" />
            <span>Generative Engine Crawler & Citation Readiness</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                engine: 'Google Gemini & Discover',
                bot: 'Google-Extended · Googlebot-News',
                status: 'NewsArticle JSON-LD + 1200px Hero Assets + News Sitemap',
              },
              {
                engine: 'ChatGPT Search',
                bot: 'OAI-SearchBot · ChatGPT-User',
                status: 'Allowed in robots.txt + /llms.txt Markdown Attribution',
              },
              {
                engine: 'Claude AI',
                bot: 'ClaudeBot',
                status: 'Entity-dense excerpts + verifiable citation blocks',
              },
              {
                engine: 'Grok / xAI',
                bot: 'Grok',
                status: 'Live breaking timestamp metadata + canonical links',
              },
            ].map((row) => (
              <div
                key={row.engine}
                className="p-4 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-neutral-900 dark:text-white">
                    {row.engine}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>
                <div className="font-mono text-[11px] text-[#0D47FF] dark:text-sky-400 mt-1">
                  {row.bot}
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1.5">
                  {row.status}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Real Core Web Vitals */}
        <div className="lg:col-span-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white mb-4">
              <Activity className="w-4 h-4 text-[#E1262D]" />
              <span>Live Core Web Vitals</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <div className="text-xs font-semibold">LCP (Largest Contentful Paint)</div>
                  <div className="text-[11px] text-neutral-400">Target &lt; 2500 ms</div>
                </div>
                <span className="font-mono font-bold text-sm tabular-nums text-emerald-600">
                  {webVitals.lcpMs !== null ? `${webVitals.lcpMs} ms` : 'Measuring'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <div className="text-xs font-semibold">CLS (Cumulative Layout Shift)</div>
                  <div className="text-[11px] text-neutral-400">Target &lt; 0.1</div>
                </div>
                <span className="font-mono font-bold text-sm tabular-nums text-emerald-600">
                  {webVitals.cls !== null ? webVitals.cls : '0.0000'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-xs font-semibold">INP (Interaction to Next Paint)</div>
                  <div className="text-[11px] text-neutral-400">Target &lt; 200 ms</div>
                </div>
                <span className="font-mono font-bold text-sm tabular-nums text-emerald-600">
                  {webVitals.inpMs !== null ? `${webVitals.inpMs} ms` : 'Interactive'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500">
            Measured directly in browser via PerformanceObserver API.
          </div>
        </div>
      </div>

      {/* AI SEO & GEO Optimizer + Live Crawler Endpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gemini AI GEO Optimizer */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Sparkles className="w-4 h-4 text-[#0D47FF]" />
              <span>AI Entity & Citation Optimizer</span>
            </div>
            <button
              type="button"
              onClick={() => void handleRunOptimizer()}
              disabled={optimizing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D47FF] hover:bg-[#0a38cc] text-white text-xs font-bold rounded disabled:opacity-60 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{optimizing ? 'Analyzing Dispatch...' : 'Run AI SEO & GEO Audit'}</span>
            </button>
          </div>

          <label className="block text-xs font-semibold text-neutral-500 mb-1.5">
            Select Dispatch to Audit & Enrich
          </label>
          <select
            value={selectedArticleId}
            onChange={(e) => {
              setSelectedArticleId(e.target.value);
              setAiResult(null);
            }}
            className="w-full p-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded mb-4"
          >
            {articles.map((a) => (
              <option key={a.id} value={a.id}>
                [{a.category}] {a.title}
              </option>
            ))}
          </select>

          {targetArticle && !aiResult && (
            <div className="p-4 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs space-y-2">
              <div>
                <span className="font-semibold text-neutral-500">Current SEO Title: </span>
                <span>{targetArticle.seoTitle || targetArticle.title}</span>
              </div>
              <div>
                <span className="font-semibold text-neutral-500">Meta Description: </span>
                <span>{targetArticle.seoDescription || targetArticle.excerpt}</span>
              </div>
              <div>
                <span className="font-semibold text-neutral-500">AI Citation Summary: </span>
                <span>{targetArticle.aiSummary || 'Run AI audit to generate citation block.'}</span>
              </div>
            </div>
          )}

          {aiResult && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                <span className="font-bold text-emerald-800 dark:text-emerald-300">
                  Google Discover & GEO Readiness Score
                </span>
                <span className="font-mono text-lg font-extrabold text-emerald-600">
                  {aiResult.discoverReadinessScore} / 100
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="font-bold text-neutral-500 uppercase text-[10px]">Optimized Title</span>
                  <p className="font-semibold text-sm mt-0.5">{aiResult.seoTitle}</p>
                </div>
                <div>
                  <span className="font-bold text-neutral-500 uppercase text-[10px]">Meta Description</span>
                  <p className="mt-0.5 text-neutral-700 dark:text-neutral-300">{aiResult.seoDescription}</p>
                </div>
                <div>
                  <span className="font-bold text-neutral-500 uppercase text-[10px]">Citation-Ready AI Summary</span>
                  <p className="mt-0.5 text-neutral-700 dark:text-neutral-300">{aiResult.aiSummary}</p>
                </div>
                <div>
                  <span className="font-bold text-neutral-500 uppercase text-[10px]">Named Knowledge Graph Entities</span>
                  <p className="mt-0.5 font-mono text-[11px] text-[#0D47FF] dark:text-sky-400">
                    {aiResult.entities?.join(' · ')}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-neutral-500 uppercase text-[10px]">Recommendations</span>
                  <ul className="mt-1 list-disc pl-4 space-y-1 text-neutral-600 dark:text-neutral-300">
                    {aiResult.geoRecommendations?.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleApplyToArticle()}
                className="px-4 py-2 bg-[#E1262D] hover:bg-[#c51e24] text-white font-bold rounded cursor-pointer"
              >
                Save Metadata to Article Record
              </button>
            </div>
          )}
        </div>

        {/* Live Crawler Files Inspector */}
        <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-6 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <FileCode2 className="w-4 h-4 text-[#E1262D]" />
              <span>Live Crawler Manifests</span>
            </div>
            <Globe className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-3 text-xs font-semibold">
            {(
              [
                { id: 'llms', label: 'llms.txt' },
                { id: 'robots', label: 'robots.txt' },
                { id: 'news', label: 'news-sitemap.xml' },
                { id: 'sitemap', label: 'sitemap.xml' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFileTab(tab.id)}
                className={`px-2 py-1 rounded cursor-pointer ${
                  activeFileTab === tab.id
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <pre className="flex-1 min-h-[280px] max-h-[360px] overflow-auto p-3 rounded bg-neutral-950 text-neutral-200 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
            {previewBundle
              ? activeFileTab === 'llms'
                ? previewBundle.llmsTxt
                : activeFileTab === 'robots'
                ? previewBundle.robotsTxt
                : activeFileTab === 'news'
                ? previewBundle.newsSitemapXml
                : previewBundle.sitemapXml
              : 'Loading live endpoint previews...'}
          </pre>
        </div>
      </div>
    </section>
  );
}
