
import React, { useState } from 'react';
import { FilterState } from '../types';
import { getWeeksInYear, formatDate, MONTH_NAMES } from '../utils/date';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from './icons';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filter: FilterState) => void;
  currentFilter: FilterState;
}

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply, currentFilter }) => {
  const [year, setYear] = useState(currentFilter.year);
  const [view, setView] = useState<'main' | 'week' | 'month'>('main');

  if (!isOpen) return null;

  const handleApply = (filter: FilterState) => {
    onApply(filter);
    onClose();
  };
  
  const renderMainView = () => (
    <>
      <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Bộ lọc dữ liệu</h2>
          <div className="flex items-center gap-4">
              <button onClick={() => setYear(y => y - 1)} className="p-2 rounded-full hover:bg-gray-200 transition-colors"><ChevronLeftIcon /></button>
              <span className="text-xl font-semibold w-20 text-center">{year}</span>
              <button onClick={() => setYear(y => y + 1)} className="p-2 rounded-full hover:bg-gray-200 transition-colors"><ChevronRightIcon /></button>
          </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <button onClick={() => setView('month')} className="w-full text-left p-4 bg-gray-100 hover:bg-blue-100 rounded-lg transition-colors">Lọc theo Tháng</button>
        <button onClick={() => setView('week')} className="w-full text-left p-4 bg-gray-100 hover:bg-blue-100 rounded-lg transition-colors">Lọc theo Tuần</button>
        <button onClick={() => handleApply({ type: 'year', year })} className="w-full text-left p-4 bg-gray-100 hover:bg-blue-100 rounded-lg transition-colors">Lọc theo Năm {year}</button>
        <button onClick={() => handleApply({ type: 'all', year: new Date().getFullYear() })} className="w-full text-left p-4 bg-gray-100 hover:bg-red-100 rounded-lg transition-colors">Hiển thị tất cả</button>
      </div>
    </>
  );

  const renderMonthView = () => (
    <>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setView('main')} className="text-blue-600 hover:underline">&larr; Quay lại</button>
        <h3 className="text-xl font-bold">Chọn tháng - {year}</h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MONTH_NAMES.map((name, index) => (
          <button
            key={name}
            onClick={() => handleApply({ type: 'month', year, month: index })}
            className="p-3 text-center bg-gray-100 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"
          >
            {name}
          </button>
        ))}
      </div>
    </>
  );

  const renderWeekView = () => {
    const weeks = getWeeksInYear(year);
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setView('main')} className="text-blue-600 hover:underline">&larr; Quay lại</button>
          <h3 className="text-xl font-bold">Chọn tuần - {year}</h3>
        </div>
        <div className="max-h-80 overflow-y-auto pr-2">
          {weeks.map(({ week, start, end }) => (
            <button
              key={week}
              onClick={() => handleApply({ type: 'week', year, week })}
              className="w-full text-left p-3 mb-2 bg-gray-100 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"
            >
              <p className="font-semibold">Tuần {week}</p>
              <p className="text-sm">{formatDate(start)} - {formatDate(end)}</p>
            </button>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <CloseIcon className="w-6 h-6" />
        </button>
        {view === 'main' && renderMainView()}
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
      </div>
    </div>
  );
};

export default FilterModal;
