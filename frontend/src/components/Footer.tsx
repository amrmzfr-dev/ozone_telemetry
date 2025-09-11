import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-left">
          <p>&copy; 2024 Ozone Telemetry System. All rights reserved.</p>
        </div>
        <div className="footer-right">
          <p>Version 1.0.0</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
