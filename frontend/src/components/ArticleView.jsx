import { motion } from 'framer-motion';
import { ChevronLeft, Clock, BookOpen } from 'lucide-react';
import { AGE_STAGES, getStageFromAge } from '../data/articles';

export default function ArticleView({ article, onClose }) {
    if (!article) return null;

    const stage = AGE_STAGES[getStageFromAge(article.ageRange)];

    // Simple markdown-style rendering
    const renderContent = (content) => {
        if (!content) return null;

        const lines = content.trim().split('\n');
        const elements = [];
        let inList = false;
        let listItems = [];
        let inTable = false;
        let tableRows = [];

        const flushList = () => {
            if (listItems.length > 0) {
                elements.push(
                    <ul key={`list-${elements.length}`} className="article-list">
                        {listItems.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                );
                listItems = [];
            }
            inList = false;
        };

        const flushTable = () => {
            if (tableRows.length > 0) {
                const [header, ...body] = tableRows;
                elements.push(
                    <div key={`table-${elements.length}`} className="article-table-wrapper">
                        <table className="article-table">
                            <thead>
                                <tr>
                                    {header.map((cell, i) => <th key={i}>{cell}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {body.map((row, i) => (
                                    <tr key={i}>
                                        {row.map((cell, j) => <td key={j}>{cell}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
                tableRows = [];
            }
            inTable = false;
        };

        lines.forEach((line, idx) => {
            const trimmed = line.trim();

            // Skip the first h1 (title) since we show it separately
            if (trimmed.startsWith('# ') && elements.length === 0) {
                return;
            }

            // Table row
            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                flushList();
                if (trimmed.includes('---')) return; // Skip separator
                const cells = trimmed.split('|').filter(c => c.trim()).map(c => c.trim());
                tableRows.push(cells);
                inTable = true;
                return;
            } else if (inTable) {
                flushTable();
            }

            // Headers
            if (trimmed.startsWith('## ')) {
                flushList();
                elements.push(<h2 key={idx} className="article-h2">{trimmed.substring(3)}</h2>);
            } else if (trimmed.startsWith('### ')) {
                flushList();
                elements.push(<h3 key={idx} className="article-h3">{trimmed.substring(4)}</h3>);
            }
            // Blockquote
            else if (trimmed.startsWith('> ')) {
                flushList();
                elements.push(
                    <blockquote key={idx} className="article-blockquote">
                        {trimmed.substring(2).replace(/\*\*/g, '')}
                    </blockquote>
                );
            }
            // List items
            else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                inList = true;
                listItems.push(trimmed.substring(2));
            }
            // Empty line
            else if (!trimmed) {
                flushList();
            }
            // Regular paragraph
            else if (trimmed && !trimmed.startsWith('|')) {
                flushList();
                // Process bold text
                const processed = trimmed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                elements.push(
                    <p key={idx} className="article-p" dangerouslySetInnerHTML={{ __html: processed }} />
                );
            }
        });

        flushList();
        flushTable();

        return elements;
    };

    return (
        <motion.div
            className="article-page"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
            {/* Hero Image */}
            <div className="article-hero">
                <img src={article.image} alt={article.title} />
                <div className="article-hero-overlay" />
                <button className="article-back-btn" onClick={onClose}>
                    <ChevronLeft size={24} />
                </button>
            </div>

            {/* Article Content */}
            <div className="article-content">
                <div className="article-meta">
                    <span
                        className="article-stage-badge"
                        style={{ backgroundColor: stage.color }}
                    >
                        {stage.label}
                    </span>
                    <span className="article-reading-time">
                        <Clock size={14} /> {article.readingTime} min read
                    </span>
                </div>

                <h1 className="article-title">{article.title}</h1>

                <p className="article-summary">{article.summary}</p>

                <div className="article-source">
                    <BookOpen size={14} /> {article.source}
                </div>

                <div className="article-body">
                    {renderContent(article.content)}
                </div>
            </div>
        </motion.div>
    );
}
