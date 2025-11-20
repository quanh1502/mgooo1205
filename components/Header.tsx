
import React, { useState, useEffect } from 'react';
import { SeasonalTheme } from '../types';

interface HeaderProps {
  theme: SeasonalTheme;
}

const Header: React.FC<HeaderProps> = ({ theme }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <header className={`p-4 rounded-lg shadow-lg mb-6 ${theme.cardBg} ${theme.primaryTextColor}`}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            {theme.icon}
            <span>{theme.greeting}</span>
          </h1>
          <p className={`mt-1 ${theme.secondaryTextColor}`}>{formatDate(currentTime)}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl md:text-4xl font-mono tracking-wider">{formatTime(currentTime)}</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
