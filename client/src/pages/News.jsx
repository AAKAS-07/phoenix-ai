import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { NewsSkeleton } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';

const News = () => {
  const { showToast } = useAuth();
  const navigate = useNavigate();

  const [news, setNews] = useState([]);
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchNews();
  }, [language]);

  const fetchNews = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/news?language=${language}`);
      if (res.data && res.data.news) {
        setNews(res.data.news);
      } else {
        setNews([]);
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      setError(true);
      showToast({
        title: 'Network error',
        message: 'Failed to fetch latest news. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    fetchNews(language);
    showToast({
      title: 'Data refreshed',
      message: 'Latest news articles reloaded successfully.',
      type: 'success'
    });
  };

  const handleOpenArticle = (article) => {
    showToast({
      title: 'Article opened',
      message: article?.title ? `Opening "${article.title.slice(0, 35)}..."` : 'Reading news article.',
      type: 'info',
      duration: 3000
    });
    navigate('/news/detail', { state: { article } });
  };

  // Helper to decode HTML entities and strip raw tags
  const cleanText = (str) => {
    if (!str) return '';
    return str
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]*>?/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  return (
    <div className="view-transition max-w-7xl mx-auto space-y-6">

      {/* Hero Header & Language Selector */}
      <div className="agri-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center text-2xl font-bold shrink-0">
            <i className="fas fa-newspaper"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title text-[#166534]">
                Farmer News & Schemes
              </h1>
              <span className="badge-info text-[10px]">
                Live Feed
              </span>
            </div>
            <p className="text-[#64748B] text-xs sm:text-sm mt-1 max-w-2xl font-medium">
              Stay informed on government agricultural schemes, crop prices, weather updates, and market policies.
            </p>
          </div>
        </div>

        {/* Language Selector Dropdown */}
        <div className="flex items-center gap-2 bg-[#F8FAFC] p-2 rounded-xl border border-[#E2E8F0] shrink-0 self-start md:self-center">
          <i className="fas fa-globe text-[#166534] text-sm pl-2"></i>
          <span className="text-xs font-bold text-[#17231C]">Language:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="form-input form-select text-xs py-1.5 px-3 bg-white"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
            <option value="te">తెలుగు (Telugu)</option>
            <option value="mr">मराठी (Marathi)</option>
          </select>
        </div>

      </div>

      {/* 2. Main News Content Grid */}
      {loading ? (
        <NewsSkeleton />
      ) : error ? (
        /* Error State */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center space-y-4 border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center mx-auto text-2xl">
            <i className="fas fa-triangle-exclamation"></i>
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-800 dark:text-white text-lg">
              Failed to Load News
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-sm mx-auto">
              Unable to connect to the agricultural news service. Please check your connection.
            </p>
          </div>
          <button
            onClick={fetchNews}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2"
          >
            <i className="fas fa-rotate-right text-xs"></i> Retry Loading News
          </button>
        </div>
      ) : news.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((item, idx) => {
            const categoryTag = item.tag || item.category || item.source || 'Agriculture';
            const pubDate = item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today';
            const cleanedTitle = cleanText(item.title);
            const cleanedDesc = cleanText(item.description);

            return (
              <div
                key={idx}
                onClick={() => handleOpenArticle(item)}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-800 overflow-hidden cursor-pointer flex flex-col justify-between group hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300"
              >
                <div>
                  {/* Article Image with Hover Zoom & Fallback */}
                  <div className="h-48 sm:h-52 w-full overflow-hidden relative bg-slate-100 dark:bg-slate-800">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop'}
                      alt={cleanedTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-5 sm:p-6 space-y-3">

                    {/* Category & Date Row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-brand-600 dark:text-brand-accent text-[10px] font-extrabold uppercase tracking-wider border border-emerald-200/50 dark:border-emerald-800/40">
                        {categoryTag}
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <i className="far fa-calendar text-[10px]"></i> {pubDate}
                      </span>
                    </div>

                    {/* Article Title */}
                    <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-brand-500 transition-colors">
                      {cleanedTitle}
                    </h3>

                    {/* Article Description */}
                    <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-3 leading-relaxed font-normal">
                      {cleanedDesc || 'Click to read the complete article details and farmer updates.'}
                    </p>

                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0">
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-brand-600 dark:text-brand-accent group-hover:text-brand-700 transition-colors">
                    <span>Read Full Article</span>
                    <i className="fas fa-arrow-right text-xs group-hover:translate-x-1.5 transition-transform duration-300"></i>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center space-y-4 border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 text-brand-500 flex items-center justify-center mx-auto text-2xl">
            <i className="fas fa-newspaper"></i>
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-800 dark:text-white text-lg">
              No Agriculture News Available
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-sm mx-auto">
              No articles were found for the selected language. Try switching to English or another language option.
            </p>
          </div>
          <button
            onClick={() => setLanguage('en')}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2"
          >
            <i className="fas fa-rotate-left text-xs"></i> Switch to English News
          </button>
        </div>
      )}

    </div>
  );
};

export default News;
