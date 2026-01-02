import { useState, useMemo } from 'react';
import { useBaby } from '../hooks/useBaby';
import { articles, CATEGORIES, getArticlesForAge, calculateAgeInMonths } from '../data/articles';
import ArticleView from './ArticleView';

export default function Learn() {
    const { selectedBaby } = useBaby();
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedArticle, setSelectedArticle] = useState(null);

    // Calculate baby's age in months
    const babyAgeMonths = useMemo(() => {
        if (!selectedBaby?.date_of_birth) return null;
        return calculateAgeInMonths(selectedBaby.date_of_birth);
    }, [selectedBaby]);

    // Get recommended articles based on baby's age
    const recommendedArticles = useMemo(() => {
        if (babyAgeMonths === null) return [];
        return getArticlesForAge(babyAgeMonths);
    }, [babyAgeMonths]);

    // Filter articles by category
    const filteredArticles = useMemo(() => {
        if (selectedCategory === 'all') return articles;
        return articles.filter(a => a.category === selectedCategory);
    }, [selectedCategory]);

    // Get age label for display
    const getAgeLabel = (ageRange) => {
        const [min, max] = ageRange;
        if (max <= 3) return 'Newborn';
        if (max <= 12) return 'Infant';
        if (max <= 24) return 'Toddler';
        return 'All Ages';
    };

    // Get category config
    const getCategoryConfig = (category) => {
        return CATEGORIES[category] || CATEGORIES.all;
    };

    return (
        <div className="learn-container">
            {/* Header */}
            <div className="learn-header">
                <h1 className="learn-title">📚 Learn</h1>
                <p className="learn-subtitle">
                    Evidence-based articles for new parents
                </p>
            </div>

            {/* Recommended Section - Only show if we have baby age */}
            {recommendedArticles.length > 0 && (
                <div className="learn-section">
                    <h2 className="learn-section-title">
                        ✨ Recommended for {selectedBaby?.name || 'Your Baby'}
                    </h2>
                    <p className="learn-section-subtitle">
                        Based on {babyAgeMonths} {babyAgeMonths === 1 ? 'month' : 'months'} old
                    </p>
                    <div className="article-scroll-container">
                        {recommendedArticles.slice(0, 5).map(article => (
                            <div
                                key={article.id}
                                className="article-card article-card-featured"
                                onClick={() => setSelectedArticle(article)}
                            >
                                <div className="article-card-icon">
                                    {getCategoryConfig(article.category).icon}
                                </div>
                                <h3 className="article-card-title">{article.title}</h3>
                                <p className="article-card-summary">{article.summary}</p>
                                <div className="article-card-meta">
                                    <span className="article-tag">{getAgeLabel(article.ageRange)}</span>
                                    <span className="article-reading-time">{article.readingTime} min read</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Category Filter */}
            <div className="learn-section">
                <h2 className="learn-section-title">Browse by Topic</h2>
                <div className="category-pills">
                    {Object.entries(CATEGORIES).map(([key, config]) => (
                        <button
                            key={key}
                            className={`category-pill ${selectedCategory === key ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(key)}
                        >
                            <span className="category-pill-icon">{config.icon}</span>
                            <span className="category-pill-label">{config.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Article Grid */}
            <div className="learn-section">
                <div className="article-grid">
                    {filteredArticles.map(article => (
                        <div
                            key={article.id}
                            className="article-card"
                            onClick={() => setSelectedArticle(article)}
                        >
                            <div className="article-card-header">
                                <span className="article-card-icon-small">
                                    {getCategoryConfig(article.category).icon}
                                </span>
                                <span className="article-tag">{getAgeLabel(article.ageRange)}</span>
                            </div>
                            <h3 className="article-card-title">{article.title}</h3>
                            <p className="article-card-summary">{article.summary}</p>
                            <div className="article-card-footer">
                                <span className="article-source">{article.source}</span>
                                <span className="article-reading-time">{article.readingTime} min</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Article View Modal */}
            {selectedArticle && (
                <ArticleView
                    article={selectedArticle}
                    onClose={() => setSelectedArticle(null)}
                />
            )}
        </div>
    );
}
