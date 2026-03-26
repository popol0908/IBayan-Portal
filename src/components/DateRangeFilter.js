import React from 'react';
import './DateRangeFilter.css';

/**
 * DateRangeFilter Component
 * Provides date range selection with quick filter presets
 * 
 * @param {string} startDate - Start date value
 * @param {string} endDate - End date value
 * @param {Function} onChange - Callback with { startDate, endDate }
 */
const DateRangeFilter = ({ startDate, endDate, onChange }) => {
    const handleQuickFilter = (days) => {
        const end = new Date();
        const start = days === 'all' ? null : new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

        onChange({
            startDate: start ? start.toISOString().split('T')[0] : '',
            endDate: end.toISOString().split('T')[0]
        });
    };

    const handleClear = () => {
        onChange({ startDate: '', endDate: '' });
    };

    return (
        <div className="date-range-filter">
            <div className="date-inputs">
                <div className="date-input-group">
                    <label htmlFor="start-date">From:</label>
                    <input
                        type="date"
                        id="start-date"
                        value={startDate || ''}
                        onChange={(e) => onChange({ startDate: e.target.value, endDate })}
                        className="date-input"
                    />
                </div>
                <div className="date-input-group">
                    <label htmlFor="end-date">To:</label>
                    <input
                        type="date"
                        id="end-date"
                        value={endDate || ''}
                        onChange={(e) => onChange({ startDate, endDate: e.target.value })}
                        className="date-input"
                    />
                </div>
            </div>

            <div className="quick-filters">
                <button
                    className="quick-filter-btn"
                    onClick={() => handleQuickFilter(7)}
                    type="button"
                >
                    Last 7 Days
                </button>
                <button
                    className="quick-filter-btn"
                    onClick={() => handleQuickFilter(30)}
                    type="button"
                >
                    Last 30 Days
                </button>
                <button
                    className="quick-filter-btn"
                    onClick={() => handleQuickFilter(90)}
                    type="button"
                >
                    Last 90 Days
                </button>
                <button
                    className="quick-filter-btn"
                    onClick={() => handleQuickFilter('all')}
                    type="button"
                >
                    All Time
                </button>
                {(startDate || endDate) && (
                    <button
                        className="quick-filter-btn clear-btn"
                        onClick={handleClear}
                        type="button"
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
};

export default DateRangeFilter;
