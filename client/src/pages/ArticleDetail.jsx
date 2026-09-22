import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ArticleDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const article = location.state?.article;

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

  if (!article) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-slate-500 text-sm">Article not found.</p>
        <button
          onClick={() => navigate('/news')}
          className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md transition-all text-xs"
        >
          ← Back to News
        </button>
      </div>
    );
  }

  const cleanedTitle = cleanText(article.title);
  const cleanedContent = cleanText(article.content || article.description);

  return (
    <div className="view-transition max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/news')}
        className="flex items-center gap-2 text-brand-600 dark:text-brand-accent font-bold hover:gap-3 transition-all text-xs mb-4"
      >
        <i className="fas fa-arrow-left"></i> Back to All News
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xs border border-slate-100 dark:border-slate-800 space-y-0">
        <div className="h-[320px] sm:h-[400px] w-full overflow-hidden relative">
          <img
            src={article.image || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop'}
            alt={cleanedTitle}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop';
            }}
          />
        </div>

        <div className="p-6 sm:p-10 space-y-6">

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-brand-600 dark:text-brand-accent text-[10px] font-extrabold rounded-full uppercase tracking-wider border border-emerald-200/50 dark:border-emerald-800/40">
              {article.tag || article.category || 'Agriculture'}
            </span>
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <i className="far fa-calendar-alt"></i>
              {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
            </span>
            {article.source && (
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <i className="fas fa-building"></i> {article.source}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-slate-900 dark:text-white leading-tight">
            {cleanedTitle}
          </h1>

          <div className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base space-y-4 font-normal">
            <p>{cleanedContent}</p>
          </div>

          {article.url && article.url !== '#' && (
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-bold rounded-2xl shadow-md transition-all text-xs"
              >
                <span>Read Original Source Article</span>
                <i className="fas fa-external-link-alt text-[10px]"></i>
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ArticleDetail;
