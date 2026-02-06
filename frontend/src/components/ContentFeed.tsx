import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Book, ChevronDown, ChevronUp } from 'lucide-react';
import { getArticlesForAge, articles, type Article } from '../data/articles';
import { useBaby } from '../hooks/useBaby';

const CATEGORY_LABELS: Record<Article['category'], string> = {
  feeding: 'Feeding',
  sleep: 'Sleep',
  development: 'Development',
  health: 'Health',
  safety: 'Safety',
  play: 'Play & Learning',
};

const CATEGORY_COLORS: Record<Article['category'], string> = {
  feeding: 'butter',
  sleep: 'lavender',
  development: 'mint',
  health: 'sky',
  safety: 'peach',
  play: 'blush',
};

export default function ContentFeed() {
  const { babies } = useBaby();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Article['category'] | 'all'>('all');

  const baby = babies?.[0];
  const ageMonths = useMemo(() => {
    if (!baby?.birth_date) return null;
    const birth = new Date(baby.birth_date);
    const now = new Date();
    return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  }, [baby?.birth_date]);

  const relevantArticles = useMemo(() => {
    let list = ageMonths !== null ? getArticlesForAge(ageMonths) : articles;
    if (filter !== 'all') {
      list = list.filter(a => a.category === filter);
    }
    return list;
  }, [ageMonths, filter]);

  const categories: (Article['category'] | 'all')[] = ['all', 'feeding', 'sleep', 'development', 'health', 'safety', 'play'];

  return (
    <div>
      {ageMonths !== null && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
          Showing tips for {ageMonths} month{ageMonths !== 1 ? 's' : ''} old
        </div>
      )}

      {/* Category filter chips */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              border: filter === cat ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: filter === cat ? 'var(--primary)' : 'var(--surface)',
              color: filter === cat ? '#fff' : 'var(--text)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {relevantArticles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-secondary)' }}>
          No articles found for this filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {relevantArticles.map(article => {
            const isExpanded = expandedId === article.id;
            return (
              <div
                key={article.id}
                style={{
                  background: 'var(--surface)',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : article.id)}
                  style={{
                    width: '100%',
                    padding: 'var(--space-md)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-sm)',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text)',
                  }}
                >
                  <div className={`settings-icon-box ${CATEGORY_COLORS[article.category]}`} style={{ flexShrink: 0, width: 32, height: 32 }}>
                    <Book size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{article.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{article.summary}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <span style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 8,
                        background: 'var(--bg)',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                      }}>
                        {CATEGORY_LABELS[article.category]}
                      </span>
                      <span style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 8,
                        background: 'var(--bg)',
                        color: 'var(--text-secondary)',
                      }}>
                        {article.source}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isExpanded && (
                  <div style={{
                    padding: '0 var(--space-md) var(--space-md)',
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: 'var(--text)',
                    borderTop: '1px solid var(--border)',
                    paddingTop: 'var(--space-md)',
                    marginTop: '-1px',
                  }}>
                    {article.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
