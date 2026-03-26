import React, { useState, useEffect } from 'react';
import { Siren, AlertTriangle, Clock, Wind, HeartPulse, Waves, Zap } from 'lucide-react';
import IconBox from '../components/IconBox';
import { getSharedData, subscribeToChanges } from '../services/dataService';
import PageLoader from '../components/PageLoader';
import './EmergencyAlerts.css';
import './Dashboard.css';

const EmergencyAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to real-time emergency alerts updates
    const unsubscribe = subscribeToChanges('emergencyAlerts', (data) => {
      setAlerts(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);
  return (
    <PageLoader isLoading={isLoading} loadingMessage="Loading emergency alerts...">
      <div className="dashboard-wrapper">
        <div className="dashboard">
          <div className="dash-content-header">
            <div className="dash-header-left">
              <h1 className="dash-title">Emergency Alerts</h1>
              <p className="dash-subtitle">View active emergency notifications and warnings in Barangay Mabayuan.</p>
            </div>
          </div>

      {}
      <div className="alerts-summary">
        <div className="summary-card">
          <IconBox variant="red" size="sm" className="summary-icon"><Siren size={24} strokeWidth={1.8} /></IconBox>
          <div className="summary-content">
            <h3 className="summary-number">{alerts.filter(alert => alert.status === 'Active').length}</h3>
            <p className="summary-label">Active Alerts</p>
          </div>
        </div>
        <div className="summary-card">
          <IconBox variant="amber" size="sm" className="summary-icon"><AlertTriangle size={24} strokeWidth={1.8} /></IconBox>
          <div className="summary-content">
            <h3 className="summary-number">{alerts.filter(alert => alert.severity === 'High').length}</h3>
            <p className="summary-label">High Priority</p>
          </div>
        </div>
        <div className="summary-card">
          <IconBox variant="blue" size="sm" className="summary-icon"><Clock size={24} strokeWidth={1.8} /></IconBox>
          <div className="summary-content">
            <h3 className="summary-number">24/7</h3>
            <p className="summary-label">Monitoring</p>
          </div>
        </div>
      </div>

      {}
      <div className="alerts-container">
        {alerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Siren size={48} strokeWidth={1.5} /></div>
            <h3>No Active Alerts</h3>
            <p>There are currently no emergency alerts. Stay safe!</p>
          </div>
        ) : (
          <div className="alerts-grid">
            {alerts.map((alert) => (
            <div key={alert.id} className="alert-card emergency-card">
              <div className="alert-header">
                <div className="alert-category">
                  <span className="category-icon">
                    {alert.category === 'Typhoon Warning' && <Wind size={18} strokeWidth={1.8} />}
                    {alert.category === 'Health Advisory' && <HeartPulse size={18} strokeWidth={1.8} />}
                    {alert.category === 'Flood Warning' && <Waves size={18} strokeWidth={1.8} />}
                    {alert.category === 'Utility Alert' && <Zap size={18} strokeWidth={1.8} />}
                    {!['Typhoon Warning', 'Health Advisory', 'Flood Warning', 'Utility Alert'].includes(alert.category) && <AlertTriangle size={18} strokeWidth={1.8} />}
                  </span>
                  <span className="category-text">{alert.category}</span>
                </div>
                <div className="alert-status">
                  <span className={`status-badge ${alert.status.toLowerCase()}`}>
                    {alert.status}
                  </span>
                </div>
              </div>
              
              <div className="alert-content">
                <h3 className="alert-title">{alert.title}</h3>
                <p className="alert-description">{alert.description}</p>
                
                <div className="alert-meta">
                  <div className="alert-severity">
                    <span className={`severity-indicator ${alert.severity.toLowerCase()}`}>
                      {alert.severity} Priority
                    </span>
                  </div>
                  <div className="alert-dates">
                    <div className="alert-date-item">
                      <span className="date-label">Date Posted:</span>
                      <span className="date-value">{alert.postedDate}</span>
                    </div>
                    {alert.effectiveDate && (
                      <div className="alert-date-item">
                        <span className="date-label">Effective Date:</span>
                        <span className="date-value">{alert.effectiveDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {}
      <div className="emergency-contacts">
        <h3 className="contacts-title">Emergency Contact Numbers</h3>
        <div className="contacts-grid">
          <div className="contact-card">
            <div className="contact-icon">🚑</div>
            <div className="contact-info">
              <h4>Emergency Services</h4>
              <p className="contact-number">911</p>
            </div>
          </div>
          <div className="contact-card">
            <div className="contact-icon">🏥</div>
            <div className="contact-info">
              <h4>Barangay Health Center</h4>
              <p className="contact-number">(02) 123-4567</p>
            </div>
          </div>
          <div className="contact-card">
            <div className="contact-icon">👮</div>
            <div className="contact-info">
              <h4>Police Station</h4>
              <p className="contact-number">(02) 987-6543</p>
            </div>
          </div>
          <div className="contact-card">
            <div className="contact-icon">🔥</div>
            <div className="contact-info">
              <h4>Fire Department</h4>
              <p className="contact-number">(02) 555-0123</p>
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>
    </PageLoader>
  );
};

export default EmergencyAlerts;
