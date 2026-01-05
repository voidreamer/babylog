import { useState, useMemo } from 'react';
import { useBaby } from '../hooks/useBaby';
import { articles, getArticlesForAge, calculateAgeInMonths, AGE_STAGES, getStageFromAge, CATEGORIES } from '../data/articles';
import ArticleView from './ArticleView';
import BabyInsights from './BabyInsights';
import { BookOpen, Moon, Utensils, Stethoscope, Baby, Shield, Sparkles, Search, X, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Category icons map
const CATEGORY_ICONS = {
    all: BookOpen,
    sleep: Moon,
    feeding: Utensils,
    health: Stethoscope,
    development: Baby,
    safety: Shield,
};

export default function Learn({ isPremium = false }) {
    const { selectedBaby } = useBaby();
    const [activeTab, setActiveTab] = useState('insights'); // 'insights' or 'articles'
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Calculate baby age in months
    const babyAgeMonths = useMemo(() => {
        if (!selectedBaby?.birth_date) return null;
        return calculateAgeInMonths(selectedBaby.birth_date);
    }, [selectedBaby]);

    // Get age-relevant articles
    const recommendedArticles = useMemo(() => {
        if (babyAgeMonths === null) return [];
        return getArticlesForAge(babyAgeMonths).slice(0, 5);
    }, [babyAgeMonths]);

    // Filter articles by category and search
    const filteredArticles = useMemo(() => {
        let filtered = articles;

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(a => a.category === selectedCategory);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(a =>
                a.title.toLowerCase().includes(query) ||
                a.summary.toLowerCase().includes(query) ||
                a.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }

        return filtered;
    }, [selectedCategory, searchQuery]);

    // Get stage info for an article
    const getArticleStage = (article) => {
        const stageKey = getStageFromAge(article.ageRange);
        return AGE_STAGES[stageKey];
    };

    // Render category icon
    const renderCategoryIcon = (category, size = 16) => {
        const IconComponent = CATEGORY_ICONS[category] || BookOpen;
        return <IconComponent size={size} />;
    };

    // Article Card Component
    const ArticleCard = ({ article, featured = false }) => {
        const stage = getArticleStage(article);

        return (
            <motion.div
                className={`learn-card ${featured ? 'featured' : ''}`}
                onClick={() => setSelectedArticle(article)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="learn-card-image">
                    <img src={article.image} alt={article.title} loading="lazy" />
                    <span
                        className="learn-card-badge"
                        style={{ backgroundColor: stage.color }}
                    >
                        {stage.label}
                    </span>
                </div>
                <div className="learn-card-content">
                    <h3 className="learn-card-title">{article.title}</h3>
                    <span className="learn-card-meta">{article.readingTime} min read</span>
                </div>
            </motion.div>
        );
    };

    // Articles content
    const ArticlesContent = () => (
        <>
            {/* Search Bar */}
            <div className="learn-search">
                <div className="learn-search-input-wrapper">
                    <Search size={18} className="learn-search-icon" />
                    <input
                        type="text"
                        className="learn-search-input"
                        placeholder="Search articles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            className="learn-search-clear"
                            onClick={() => setSearchQuery('')}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                <span className="learn-article-count">
                    {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Featured/Recommended Section */}
            {recommendedArticles.length > 0 && (
                <section className="learn-featured">
                    <h2 className="learn-section-title">
                        <Sparkles size={18} /> Recommended for You
                    </h2>
                    <div className="learn-featured-scroll">
                        {recommendedArticles.map(article => (
                            <ArticleCard key={article.id} article={article} featured />
                        ))}
                    </div>
                </section>
            )}

            {/* Category Filter */}
            <div className="learn-categories">
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <button
                        key={key}
                        className={`learn-category-btn ${selectedCategory === key ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(key)}
                    >
                        {renderCategoryIcon(key, 14)}
                        <span>{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Articles Grid */}
            <section className="learn-grid">
                {filteredArticles.map((article, index) => (
                    <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                        <ArticleCard article={article} />
                    </motion.div>
                ))}
            </section>
        </>
    );

    return (
        <div className="learn-page">
            <AnimatePresence mode="wait">
                {selectedArticle ? (
                    <ArticleView
                        key="article"
                        article={selectedArticle}
                        onClose={() => setSelectedArticle(null)}
                    />
                ) : (
                    <motion.div
                        key="list"
                        className="learn-container"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Header */}
                        <div className="learn-header">
                            <h1 className="learn-title">
                                <BookOpen size={24} /> Learn
                            </h1>
                            {selectedBaby && babyAgeMonths !== null && (
                                <p className="learn-subtitle">
                                    <Sparkles size={14} /> For {selectedBaby.name}, {babyAgeMonths} {babyAgeMonths === 1 ? 'month' : 'months'} old
                                </p>
                            )}
                        </div>

                        {/* Tab Navigation */}
                        <div className="learn-tabs">
                            <button
                                className={`learn-tab ${activeTab === 'insights' ? 'active' : ''}`}
                                onClick={() => setActiveTab('insights')}
                            >
                                <TrendingUp size={16} />
                                <span>Your Baby</span>
                            </button>
                            <button
                                className={`learn-tab ${activeTab === 'articles' ? 'active' : ''}`}
                                onClick={() => setActiveTab('articles')}
                            >
                                <BookOpen size={16} />
                                <span>Articles</span>
                            </button>
                        </div>

                        {/* Tab Content */}
                        <AnimatePresence mode="wait">
                            {activeTab === 'insights' ? (
                                <motion.div
                                    key="insights"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <BabyInsights isPremium={isPremium} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="articles"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ArticlesContent />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
