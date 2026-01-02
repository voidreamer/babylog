import { useEffect } from 'react';

// Simple markdown-like rendering for article content
const renderContent = (content) => {
    if (!content) return null;

    const lines = content.trim().split('\n');
    const elements = [];
    let inTable = false;
    let tableRows = [];
    let inList = false;
    let listItems = [];

    const processLine = (line, index) => {
        // Headers
        if (line.startsWith('# ')) {
            return <h1 key={index} className="article-h1">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
            return <h2 key={index} className="article-h2">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
            return <h3 key={index} className="article-h3">{line.slice(4)}</h3>;
        }

        // Blockquote
        if (line.startsWith('> ')) {
            return <blockquote key={index} className="article-blockquote">{line.slice(2)}</blockquote>;
        }

        // Bold text (simple replacement)
        let processedLine = line
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/✅/g, '<span class="check-green">✅</span>')
            .replace(/❌/g, '<span class="check-red">❌</span>');

        // List items
        if (line.startsWith('- ')) {
            return (
                <li key={index} className="article-list-item"
                    dangerouslySetInnerHTML={{ __html: processedLine.slice(2) }}
                />
            );
        }

        // Numbered list
        if (/^\d+\.\s/.test(line)) {
            return (
                <li key={index} className="article-list-item-numbered"
                    dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s/, '') }}
                />
            );
        }

        // Empty line
        if (line.trim() === '') {
            return <br key={index} />;
        }

        // Regular paragraph
        return (
            <p key={index} className="article-paragraph"
                dangerouslySetInnerHTML={{ __html: processedLine }}
            />
        );
    };

    // Simple table detection and rendering
    const renderTable = (lines) => {
        const rows = lines.filter(l => l.includes('|') && !l.match(/^\|[-\s|]+\|$/));
        if (rows.length === 0) return null;

        const parseRow = (row) => {
            return row.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
        };

        const headerRow = parseRow(rows[0]);
        const dataRows = rows.slice(1).map(parseRow);

        return (
            <table className="article-table">
                <thead>
                    <tr>
                        {headerRow.map((cell, i) => <th key={i}>{cell}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {dataRows.map((row, i) => (
                        <tr key={i}>
                            {row.map((cell, j) => <td key={j}>{cell}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    // Process lines with table detection
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];

        // Check if this is the start of a table
        if (line.includes('|') && i + 1 < lines.length && lines[i + 1].match(/^\|[-\s|]+\|$/)) {
            // Collect all table lines
            const tableLines = [];
            while (i < lines.length && lines[i].includes('|')) {
                tableLines.push(lines[i]);
                i++;
            }
            elements.push(<div key={`table-${i}`}>{renderTable(tableLines)}</div>);
        } else {
            elements.push(processLine(line, i));
            i++;
        }
    }

    return elements;
};

export default function ArticleView({ article, onClose }) {
    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!article) return null;

    return (
        <div className="article-view-overlay" onClick={onClose}>
            <div className="article-view" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="article-view-header">
                    <button className="article-view-close" onClick={onClose}>
                        ← Back
                    </button>
                    <span className="article-view-reading-time">
                        {article.readingTime} min read
                    </span>
                </div>

                {/* Content */}
                <div className="article-view-content">
                    <div className="article-view-meta">
                        <span className="article-tag">{article.category}</span>
                        <span className="article-source">Source: {article.source}</span>
                    </div>

                    <div className="article-body">
                        {renderContent(article.content)}
                    </div>
                </div>
            </div>
        </div>
    );
}
