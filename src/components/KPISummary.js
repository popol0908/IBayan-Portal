import React from 'react';
import './KPISummary.css';

/**
 * KPISummary Component
 * Displays KPI metrics in a grid of cards
 * 
 * @param {Array} kpis - Array of KPI objects { icon, label, value, color }
 */
const KPISummary = ({ kpis = [] }) => {
    if (!kpis || kpis.length === 0) {
        return null;
    }

    return (
        <div className="kpi-summary-grid">
            {kpis.map((kpi, index) => (
                <div key={index} className={`kpi-card kpi-${kpi.color || 'blue'}`}>
                    <div className="kpi-icon">{kpi.icon}</div>
                    <div className="kpi-content">
                        <div className="kpi-value">{kpi.value}</div>
                        <div className="kpi-label">{kpi.label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KPISummary;
