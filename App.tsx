
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Debt, FilterState, GasLog, SeasonalTheme, Transaction, ExpenseLog, DebtTransaction } from './types';
import { TaurusIcon, StarIcon, SnowflakeIcon, FilterIcon, GasPumpIcon, WifiIcon, FoodIcon, PiggyBankIcon, TargetIcon, ChartLineIcon, WarningIcon, PlusIcon, CheckIcon, CalendarIcon, TagIcon, MoneyBillIcon, BoltIcon, SaveIcon, MomoIcon, CircleIcon, CheckCircleIcon, RefreshIcon, ArrowDownIcon, HistoryIcon, HourglassIcon, CloseIcon, ListIcon, TrashIcon, CreditCardIcon, RepeatIcon, EditIcon, ReceiptIcon, ShoppingBagIcon, MinusIcon } from './components/icons';
import { formatDate, formatDateTime, daysBetween, getWeekNumber, getWeekRange, isDateInFilter, MONTH_NAMES } from './utils/date';
import Header from './components/Header';
import FilterModal from './components/FilterModal';
import { sadDogImageBase64 } from './assets/sadDogImage';

// --- Helper Components ---

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
    value: number;
    onValueChange: (value: number) => void;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onValueChange, className, placeholder, ...props }) => {
    // Display value is the actual value divided by 1000 (e.g., 315000 -> 315)
    // If value is 0 or undefined, show empty string to allow placeholder
    const displayValue = value === 0 ? '' : (value / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 3 });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Allow numbers and dots/commas (though we strip non-digits for calculation)
        const rawValue = e.target.value.replace(/[^0-9.]/g, '');
        
        // If user clears input, set to 0
        if (!rawValue) {
            onValueChange(0);
            return;
        }

        // Convert input (e.g. "315") back to full value (315000)
        // Support decimal input for precise small amounts (e.g. 0.5 -> 500)
        const numValue = parseFloat(rawValue);
        if (!isNaN(numValue)) {
            onValueChange(numValue * 1000);
        }
    };

    return (
        <div className="relative w-full">
            <input
                {...props}
                type="text"
                className={`${className} pr-12`} // Add padding right to accommodate the suffix
                value={displayValue}
                onChange={handleChange}
                placeholder={placeholder || "0"}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none select-none font-medium">
                .000
            </span>
        </div>
    );
};

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: string;
    color: string;
    subtitle?: string;
    theme: SeasonalTheme;
}
const StatCard: React.FC<StatCardProps> = ({ icon, title, value, color, subtitle, theme }) => (
    <div className={`${theme.cardBg} p-4 rounded-lg shadow-md flex items-center`}>
        <div className={`mr-4 text-3xl ${color}`}>{icon}</div>
        <div>
            <p className={`text-sm ${theme.secondaryTextColor}`}>{title}</p>
            <p className={`text-xl font-bold ${theme.primaryTextColor}`}>{value}</p>
            {subtitle && <p className={`text-xs ${theme.secondaryTextColor}`}>{subtitle}</p>}
        </div>
    </div>
);

interface DebtItemProps {
    debt: Debt;
    onAddPayment: (id: string, amount: number) => void;
    onWithdrawPayment: (id: string, amount: number, reason: string) => void;
    onEdit: (debt: Debt) => void;
    theme: SeasonalTheme;
}
const DebtItem: React.FC<DebtItemProps> = ({ debt, onAddPayment, onWithdrawPayment, onEdit, theme }) => {
    const [inputValue, setInputValue] = useState(0);
    const [showWithdrawReason, setShowWithdrawReason] = useState(false);
    const [withdrawReason, setWithdrawReason] = useState('');
    const [showHistory, setShowHistory] = useState(false);

    const remaining = debt.totalAmount - debt.amountPaid;
    const today = new Date();
    const isOverdue = today > debt.dueDate && remaining > 0;
    const daysLeft = Math.ceil((debt.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const handleAdd = () => {
        if (inputValue <= 0) return;
        onAddPayment(debt.id, inputValue);
        setInputValue(0);
    };

    const initiateWithdraw = () => {
        if (inputValue <= 0) return;
        if (inputValue > debt.amountPaid) {
            alert("Không thể rút quá số tiền đã đóng!");
            return;
        }
        setShowWithdrawReason(true);
    };

    const confirmWithdraw = () => {
        if (!withdrawReason.trim()) {
            alert("Vui lòng nhập lý do rút tiền!");
            return;
        }
        onWithdrawPayment(debt.id, inputValue, withdrawReason);
        setShowWithdrawReason(false);
        setWithdrawReason('');
        setInputValue(0);
    };

    const accentColorClass = theme.accentColor.replace('bg-', 'ring-');
    const accentBorderClass = theme.accentColor.replace('bg-', 'border-');

    let statusColor = 'text-green-400';
    let statusText = `Còn ${daysLeft} ngày`;
    if (daysLeft < 0) {
        statusColor = 'text-red-400';
        statusText = `Quá hạn ${Math.abs(daysLeft)} ngày`;
    } else if (daysLeft <= 3) {
        statusColor = 'text-orange-400';
        statusText = `Gấp! Còn ${daysLeft} ngày`;
    }

    const targetBudgetInfo = debt.targetMonth !== undefined 
        ? `Ngân sách: ${MONTH_NAMES[debt.targetMonth]} ${debt.targetYear}` 
        : null;

    return (
        <div className={`p-4 rounded-lg shadow-md mb-3 transition-all duration-300 ${isOverdue ? 'bg-red-900/20 border border-red-500/30' : `${theme.cardBg} border border-slate-700/50`}`}>
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2">
                        <h4 className={`font-bold text-lg ${theme.primaryTextColor}`}>{debt.name}</h4>
                        <button onClick={() => onEdit(debt)} className="text-xs text-slate-500 hover:text-white p-1 rounded hover:bg-white/10 transition">
                            <EditIcon />
                        </button>
                        <button 
                            onClick={() => setShowHistory(!showHistory)} 
                            className={`text-xs px-2 py-1 rounded transition ${showHistory ? 'bg-blue-500/30 text-blue-200' : 'text-slate-500 hover:text-blue-300'}`}
                        >
                            <HistoryIcon className="mr-1"/> Lịch sử
                        </button>
                    </div>
                    <p className={`text-sm ${theme.secondaryTextColor} flex items-center gap-2`}><TagIcon /> {debt.source}</p>
                    <p className={`text-sm ${theme.secondaryTextColor} flex items-center gap-2`}><CalendarIcon/> Hạn: {formatDate(debt.dueDate)}</p>
                    {targetBudgetInfo && (
                        <p className="text-xs text-amber-400/80 mt-1 italic border-l-2 border-amber-400/50 pl-2">
                            {targetBudgetInfo}
                        </p>
                    )}
                </div>
                <div className="text-right">
                    <p className={`font-bold text-xl ${theme.primaryTextColor}`}>{remaining.toLocaleString('vi-VN')}đ</p>
                    <div className={`text-sm font-bold flex items-center justify-end gap-1 mt-1 ${statusColor}`}>
                        <HourglassIcon className="text-xs"/>
                        {statusText}
                    </div>
                </div>
            </div>
            
            {showHistory && debt.transactions && debt.transactions.length > 0 && (
                <div className="mt-3 mb-3 bg-black/40 rounded p-2 text-xs max-h-32 overflow-y-auto">
                    <h5 className="font-bold text-slate-400 mb-1 sticky top-0 bg-black/40 pb-1">Lịch sử giao dịch:</h5>
                    {debt.transactions.slice().reverse().map(t => (
                        <div key={t.id} className="flex justify-between py-1 border-b border-white/5 last:border-0">
                            <span className="text-slate-400">{formatDate(new Date(t.date))}</span>
                            <div className="text-right">
                                <span className={t.type === 'payment' ? 'text-green-400' : 'text-red-400 font-bold'}>
                                    {t.type === 'payment' ? '+' : '-'}{t.amount.toLocaleString('vi-VN')}
                                </span>
                                {t.reason && <span className="block text-[10px] text-slate-500 italic">{t.reason}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-4">
                <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div className={`${theme.accentColor} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${Math.min((debt.amountPaid / debt.totalAmount) * 100, 100)}%` }}></div>
                </div>
                <div className={`text-xs ${theme.secondaryTextColor} mt-1 flex justify-between`}>
                    <span>Đã trả: {debt.amountPaid.toLocaleString('vi-VN')}đ</span>
                    <span>Tổng: {debt.totalAmount.toLocaleString('vi-VN')}đ</span>
                </div>
            </div>

             <div className="mt-3 flex items-end gap-2">
                <div className="flex-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">Cập nhật số tiền</label>
                    <CurrencyInput
                        value={inputValue}
                        onValueChange={setInputValue}
                        className={`w-full px-3 py-1.5 bg-slate-800/50 border border-slate-600 rounded-md focus:ring-2 focus:${accentColorClass} focus:${accentBorderClass} transition text-white`}
                        placeholder="Nhập số tiền..."
                    />
                </div>
                <button 
                    onClick={handleAdd} 
                    disabled={inputValue <= 0}
                    className={`px-3 py-1.5 h-[38px] rounded-md text-slate-900 font-bold ${theme.accentColor} hover:opacity-80 transition disabled:opacity-50 flex items-center`}
                    title="Góp thêm"
                >
                    <PlusIcon />
                </button>
                <button 
                    onClick={initiateWithdraw} 
                    disabled={inputValue <= 0 || inputValue > debt.amountPaid}
                    className="px-3 py-1.5 h-[38px] rounded-md text-white font-bold bg-slate-700 hover:bg-red-900/50 hover:text-red-400 transition disabled:opacity-50 flex items-center"
                    title="Rút bớt (Tiêu dùng)"
                >
                    <MinusIcon />
                </button>
            </div>

            {/* Withdraw Reason Modal (Inline) */}
            {showWithdrawReason && (
                <div className="mt-2 p-3 bg-red-900/20 border border-red-500/30 rounded animate-fade-in-up">
                    <label className="block text-xs font-bold text-red-300 mb-1">Lý do rút tiền (Bắt buộc):</label>
                    <input 
                        type="text" 
                        value={withdrawReason}
                        onChange={(e) => setWithdrawReason(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white px-2 py-1 rounded text-sm mb-2 focus:border-red-400 outline-none"
                        placeholder="VD: Cần tiền mua thuốc..."
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => setShowWithdrawReason(false)}
                            className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-300"
                        >
                            Hủy
                        </button>
                        <button 
                            onClick={confirmWithdraw}
                            className="px-2 py-1 text-xs rounded bg-red-600 text-white font-bold hover:bg-red-500"
                        >
                            Xác nhận rút
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

interface BudgetRowProps {
    icon: React.ReactNode;
    label: string;
    budget: number;
    actual: number;
    onBudgetChange: (val: number) => void;
    onActualChange: (val: number) => void;
    theme: SeasonalTheme;
    colorClass: string;
    onDetailClick?: () => void;
}

const BudgetRow: React.FC<BudgetRowProps> = ({ icon, label, budget, actual, onBudgetChange, onActualChange, theme, colorClass, onDetailClick }) => {
    const percentage = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0;
    const isOverBudget = actual > budget && budget > 0;

    return (
        <div className="p-3 bg-black/20 rounded-md relative group">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                    <span className={`${colorClass} mr-3`}>{icon}</span>
                    <span className={`font-semibold ${theme.primaryTextColor}`}>{label}</span>
                </div>
                <div className="flex items-center gap-2">
                     {isOverBudget && <span className="text-xs text-red-400 font-bold animate-pulse">Vượt ngân sách!</span>}
                     {onDetailClick && (
                         <button 
                            onClick={onDetailClick}
                            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition flex items-center gap-1"
                         >
                             <ListIcon /> Xem thêm
                         </button>
                     )}
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-2">
                <div>
                    <label className={`block text-xs ${theme.secondaryTextColor} mb-1`}>Ngân sách (Dự kiến)</label>
                    <CurrencyInput
                        value={budget}
                        onValueChange={onBudgetChange}
                        className="input w-full text-right py-1.5 text-sm"
                    />
                </div>
                <div>
                    <label className={`block text-xs ${theme.secondaryTextColor} mb-1`}>Chi thực tế</label>
                    <CurrencyInput
                        value={actual}
                        onValueChange={onActualChange}
                        className={`input w-full text-right py-1.5 text-sm ${isOverBudget ? 'border-red-500/50 text-red-200' : ''}`}
                    />
                </div>
            </div>
            
            <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                <div 
                    className={`h-1.5 rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : theme.accentColor}`} 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

// --- Main App Component ---

const App: React.FC = () => {
    const [gasHistory, setGasHistory] = useState<GasLog[]>([]);
    const [lastWifiPayment, setLastWifiPayment] = useState<Date | null>(null);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [weeklyIncome, setWeeklyIncome] = useState<number>(0);
    const [incomeInput, setIncomeInput] = useState<number>(0);
    
    // Budget vs Actual States
    const [foodBudget, setFoodBudget] = useState<number>(315000);
    const [actualFoodSpending, setActualFoodSpending] = useState<number>(0);
    
    const [miscBudget, setMiscBudget] = useState<number>(100000);
    const [actualMiscSpending, setActualMiscSpending] = useState<number>(0);
    const [miscLogs, setMiscLogs] = useState<ExpenseLog[]>([]); // New state for misc logs
    
    const [isMomoConnected, setMomoConnected] = useState(false);
    
    const [currentDate] = useState(new Date());
    const initialYear = currentDate.getFullYear();
    const [, initialWeek] = getWeekNumber(currentDate);

    // Global Filter
    const [filter, setFilter] = useState<FilterState>({ type: 'week', year: initialYear, week: initialWeek });
    
    // Debt Filter (Independent)
    const [debtFilterMonth, setDebtFilterMonth] = useState(currentDate.getMonth());
    const [debtFilterYear, setDebtFilterYear] = useState(currentDate.getFullYear());

    const [isFilterModalOpen, setFilterModalOpen] = useState(false);
    const [isDebtModalOpen, setDebtModalOpen] = useState(false);
    const [editingDebtId, setEditingDebtId] = useState<string | null>(null); // Track which debt is being edited

    const [isMomoSyncModalOpen, setMomoSyncModalOpen] = useState(false);
    const [isDebtHistoryOpen, setDebtHistoryOpen] = useState(false);
    const [isMiscDetailOpen, setMiscDetailOpen] = useState(false); // New modal state
    const [isSyncing, setIsSyncing] = useState(false);
    const [foundTransactions, setFoundTransactions] = useState<Transaction[]>([]);
    
    // New Debt State
    const [debtType, setDebtType] = useState<'standard' | 'shopee'>('standard');
    const [newDebt, setNewDebt] = useState({ 
        name: '', 
        source: '', 
        totalAmount: 0, 
        dueDate: new Date().toISOString().slice(0, 10),
        targetMonth: currentDate.getMonth(),
        targetYear: currentDate.getFullYear()
    });
    
    // Shopee Specific State
    const [shopeeBillMonth, setShopeeBillMonth] = useState(currentDate.getMonth());
    const [shopeeBillYear, setShopeeBillYear] = useState(currentDate.getFullYear());

    // Recurring Debt State
    const [isRecurringDebt, setIsRecurringDebt] = useState(false);
    const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'monthly'>('monthly');
    const [recurringEndDate, setRecurringEndDate] = useState('');

    // New Log State
    const [newMiscLog, setNewMiscLog] = useState({
        name: '',
        amount: 0,
        date: new Date().toISOString().slice(0, 10)
    });
    
    // Seasonal Theming
    const seasonalTheme = useMemo<SeasonalTheme>(() => {
        const month = currentDate.getMonth();
        const baseTheme = {
            greeting: "Chào mừng trở lại, Lê Quỳnh Anh!",
            background: "bg-gradient-to-br from-gray-900 via-blue-950 to-indigo-900",
            primaryTextColor: "text-slate-100",
            secondaryTextColor: "text-slate-400",
            cardBg: "bg-black/20 backdrop-blur-lg border border-white/10",
            accentColor: "bg-amber-400",
            icon: <TaurusIcon className="text-amber-300"/>,
        };

        if (month === 11 || month === 0 || month === 1) { // Winter
            return {
                ...baseTheme,
                greeting: "Giáng sinh an lành, Lê Quỳnh Anh!",
                decorations: (
                     <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                        <div className="shooting-star" style={{top: '10%', left: '80%', animationDelay: '1s'}}></div>
                        <div className="shooting-star" style={{top: '50%', left: '20%', animationDelay: '5s'}}></div>
                        <StarIcon className="text-white/20 absolute top-[10%] left-[20%] text-xs animate-pulse" />
                        <StarIcon className="text-white/20 absolute top-[30%] left-[80%] text-sm animate-pulse delay-300" />
                        <StarIcon className="text-white/20 absolute top-[70%] left-[10%] text-xs animate-pulse delay-500" />
                        <StarIcon className="text-white/20 absolute top-[85%] left-[60%] text-base animate-pulse delay-700" />
                        <SnowflakeIcon className="text-white/10 absolute top-1/4 left-10 text-7xl animate-pulse" />
                        <SnowflakeIcon className="text-white/10 absolute bottom-10 right-20 text-5xl animate-pulse delay-1000" />
                    </div>
                )
            };
        }
        return baseTheme;
    }, [currentDate]);

    // Fixed Expenses
    const GAS_COST = 70000;
    const WIFI_COST = 30000;
    const FIXED_EXPENSES = GAS_COST + WIFI_COST;

    // Derived State and Calculations
    const lastGasFill = gasHistory.length > 0 ? gasHistory[gasHistory.length - 1] : null;
    
    const isGasFilledToday = useMemo(() => {
        if (!lastGasFill) return false;
        const today = new Date();
        return lastGasFill.date.getDate() === today.getDate() &&
               lastGasFill.date.getMonth() === today.getMonth() &&
               lastGasFill.date.getFullYear() === today.getFullYear();
    }, [lastGasFill]);

    const gasDurationComparison = useMemo(() => {
        if (gasHistory.length < 2) return null;
        const last = gasHistory[gasHistory.length - 1];
        const secondLast = gasHistory[gasHistory.length - 2];
        const lastDuration = daysBetween(secondLast.date, last.date);
        return {
            lastDuration,
            isShorter: lastDuration < 5, 
        };
    }, [gasHistory]);
    
    const isWifiPaidRecently = useMemo(() => {
        if (!lastWifiPayment) return false;
        const daysSince = daysBetween(lastWifiPayment, new Date());
        return daysSince < 7;
    }, [lastWifiPayment]);

    const wifiWarning = useMemo(() => {
        if (!lastWifiPayment) return false;
        const daysSincePayment = daysBetween(lastWifiPayment, new Date());
        return daysSincePayment >= 6;
    }, [lastWifiPayment]);
    
    // Calculate active vs completed debts
    const { activeDebts, completedDebts } = useMemo(() => {
        return debts.reduce((acc, debt) => {
            if (debt.amountPaid >= debt.totalAmount) {
                acc.completedDebts.push(debt);
            } else {
                acc.activeDebts.push(debt);
            }
            return acc;
        }, { activeDebts: [] as Debt[], completedDebts: [] as Debt[] });
    }, [debts]);

    // Filter active debts for display based on the Debt Card filter
    const displayDebts = useMemo(() => {
        return activeDebts.filter(debt => {
            // Default to due date filtering if targetMonth not set (for backward compatibility)
            // Otherwise use targetMonth
            const filterM = debt.targetMonth !== undefined ? debt.targetMonth : debt.dueDate.getMonth();
            const filterY = debt.targetYear !== undefined ? debt.targetYear : debt.dueDate.getFullYear();
            return filterM === debtFilterMonth && filterY === debtFilterYear;
        }).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    }, [activeDebts, debtFilterMonth, debtFilterYear]);

    const weeklyDebtContribution = useMemo(() => {
        // Calculate contributions based on ALL active debts, not just filtered ones
        return activeDebts.reduce((total, debt) => {
            const remainingAmount = debt.totalAmount - debt.amountPaid;
            if (remainingAmount <= 0) return total;

            const weeksLeft = Math.ceil(daysBetween(new Date(), debt.dueDate) / 7);
            if (weeksLeft <= 0) return total + remainingAmount; 

            return total + (remainingAmount / weeksLeft);
        }, 0);
    }, [activeDebts]);

    // MOMO Integration Logic (Simulated)
    const handleMomoConnect = () => {
        if (!isMomoConnected) {
            // Simulate connection
            setTimeout(() => {
                setMomoConnected(true);
                alert("Đã liên kết thành công với ví Momo!");
            }, 800);
        } else {
            setMomoConnected(false);
        }
    };

    const handleSyncMomo = () => {
        if (!isMomoConnected) {
            alert("Vui lòng liên kết ví Momo trước!");
            return;
        }
        setIsSyncing(true);
        // Simulate API call delay
        setTimeout(() => {
            const mockTransactions: Transaction[] = [
                { id: `m1-${Date.now()}`, description: 'Highlands Coffee', amount: 59000, date: new Date(), category: 'food', isSelected: true },
                { id: `m2-${Date.now()}`, description: 'Circle K', amount: 23000, date: new Date(), category: 'food', isSelected: true },
                { id: `m3-${Date.now()}`, description: 'GrabBike', amount: 35000, date: new Date(), category: 'misc', isSelected: true },
                { id: `m4-${Date.now()}`, description: 'Thanh toán Shopee', amount: 150000, date: new Date(), category: 'misc', isSelected: false },
            ];
            setFoundTransactions(mockTransactions);
            setIsSyncing(false);
            setMomoSyncModalOpen(true);
        }, 1500);
    };

    const handleImportMomoTransactions = () => {
        const selectedTransactions = foundTransactions.filter(t => t.isSelected);
        
        const foodTotal = selectedTransactions
            .filter(t => t.category === 'food')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const miscTotal = selectedTransactions
            .filter(t => t.category === 'misc')
            .reduce((sum, t) => sum + t.amount, 0);
        
        if (foodTotal > 0) setActualFoodSpending(prev => prev + foodTotal);
        if (miscTotal > 0) setActualMiscSpending(prev => prev + miscTotal);
        
        // Also add misc transactions to the log list
        const newMiscLogs = selectedTransactions
            .filter(t => t.category === 'misc')
            .map(t => ({
                id: t.id,
                name: t.description,
                amount: t.amount,
                date: t.date
            }));
            
        if (newMiscLogs.length > 0) {
            setMiscLogs(prev => [...prev, ...newMiscLogs]);
        }

        setMomoSyncModalOpen(false);
    };

    const toggleTransactionSelection = (id: string) => {
        setFoundTransactions(prev => prev.map(t => t.id === id ? {...t, isSelected: !t.isSelected} : t));
    };

    // Calculate Totals
    const totalPlannedSpending = FIXED_EXPENSES + foodBudget + miscBudget + weeklyDebtContribution;
    const totalActualSpending = FIXED_EXPENSES + actualFoodSpending + actualMiscSpending + weeklyDebtContribution;
    
    const financialStatus = weeklyIncome - totalActualSpending;
    
    const daysOffCanTake = useMemo(() => {
        const totalDebtRemaining = activeDebts.reduce((sum, d) => sum + (d.totalAmount - d.amountPaid), 0);
        if (totalDebtRemaining <= 0) return Infinity; 
        const dailySpending = totalActualSpending / 7;
        if(dailySpending <= 0) return Infinity;
        const surplus = weeklyIncome > totalActualSpending ? weeklyIncome - totalActualSpending : 0;
        
        if (surplus <= 0) return 0;
        return Math.floor(surplus / dailySpending);
    }, [activeDebts, weeklyIncome, totalActualSpending]);

    // Handlers
    const handleToggleGas = () => {
        if (isGasFilledToday) {
             // Remove today's entry (untick)
             setGasHistory(prev => {
                 const today = new Date();
                 return prev.filter(log => 
                    log.date.getDate() !== today.getDate() ||
                    log.date.getMonth() !== today.getMonth() ||
                    log.date.getFullYear() !== today.getFullYear()
                 );
             });
        } else {
             // Add entry
             setGasHistory(prev => [...prev, { id: Date.now().toString(), date: new Date() }]);
        }
    };
    
    const handleToggleWifi = () => {
        if (isWifiPaidRecently) {
             // Untick - clear payment
             setLastWifiPayment(null);
        } else {
             // Tick - set payment to now
             setLastWifiPayment(new Date());
        }
    };
    
    const handleUpdateIncome = () => {
        setWeeklyIncome(incomeInput);
    };

    // Handle saving (adding or updating) a debt
    const handleSaveDebt = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (editingDebtId) {
            // Update existing debt
            setDebts(prev => prev.map(d => {
                if (d.id === editingDebtId) {
                    return {
                        ...d,
                        name: newDebt.name,
                        source: newDebt.source,
                        totalAmount: newDebt.totalAmount,
                        dueDate: new Date(newDebt.dueDate),
                        targetMonth: newDebt.targetMonth,
                        targetYear: newDebt.targetYear
                    };
                }
                return d;
            }));
            setEditingDebtId(null);
        } else {
            // Create new debt(s)
            const debtsToAdd: Debt[] = [];

            if (debtType === 'shopee') {
                // Handle Shopee SPayLater
                // Calculate due date: 10th of NEXT month relative to bill month
                const billMonth = shopeeBillMonth;
                const billYear = shopeeBillYear;
                
                // Due date is 10th of month + 1
                let dueMonth = billMonth + 1;
                let dueYear = billYear;
                
                if (dueMonth > 11) {
                    dueMonth = 0;
                    dueYear = dueYear + 1;
                }
                
                const dueDate = new Date(dueYear, dueMonth, 10);
                
                debtsToAdd.push({
                    id: Date.now().toString(),
                    name: `SPayLater - Hóa đơn T${billMonth + 1}`,
                    source: 'Shopee SPayLater',
                    totalAmount: newDebt.totalAmount, // User enters amount in general field
                    amountPaid: 0,
                    dueDate: dueDate,
                    createdAt: new Date(),
                    targetMonth: dueMonth, // Budget belongs to the payment month
                    targetYear: dueYear,
                    transactions: []
                });

            } else if (isRecurringDebt) {
                if (!newDebt.dueDate || !recurringEndDate) {
                    alert("Vui lòng chọn ngày bắt đầu và ngày kết thúc!");
                    return;
                }

                const startDate = new Date(newDebt.dueDate);
                const endDate = new Date(recurringEndDate);
                let currentDate = new Date(startDate);
                let count = 1;

                while (currentDate <= endDate) {
                     const dueDate = new Date(currentDate);
                     const month = dueDate.getMonth();
                     const year = dueDate.getFullYear();

                     let debtNameSuffix = '';
                     if (recurringFrequency === 'monthly') {
                         debtNameSuffix = `(Tháng ${month + 1}/${year})`;
                     } else {
                         debtNameSuffix = `(Kỳ ${count})`;
                     }

                     debtsToAdd.push({
                        id: `${Date.now()}-${count}`,
                        name: `${newDebt.name} ${debtNameSuffix}`,
                        source: newDebt.source,
                        totalAmount: newDebt.totalAmount,
                        amountPaid: 0,
                        dueDate: dueDate,
                        createdAt: new Date(),
                        targetMonth: month,
                        targetYear: year,
                        transactions: []
                    });

                    // Advance Date
                    if (recurringFrequency === 'weekly') {
                        currentDate.setDate(currentDate.getDate() + 7);
                    } else {
                        currentDate.setMonth(currentDate.getMonth() + 1);
                    }
                    count++;
                }

            } else {
                // Single debt creation
                debtsToAdd.push({
                    id: Date.now().toString(),
                    name: newDebt.name,
                    source: newDebt.source,
                    totalAmount: newDebt.totalAmount,
                    amountPaid: 0,
                    dueDate: new Date(newDebt.dueDate),
                    createdAt: new Date(),
                    targetMonth: newDebt.targetMonth,
                    targetYear: newDebt.targetYear,
                    transactions: []
                });
            }

            setDebts(prev => [...prev, ...debtsToAdd]);
        }
        
        // Reset form
        setNewDebt({ 
            name: '', 
            source: '', 
            totalAmount: 0, 
            dueDate: new Date().toISOString().slice(0, 10),
            targetMonth: currentDate.getMonth(),
            targetYear: currentDate.getFullYear()
        });
        setIsRecurringDebt(false);
        setRecurringEndDate('');
        setDebtModalOpen(false);
        setEditingDebtId(null);
        setDebtType('standard'); // Reset to standard
    };
    
    const handleEditDebt = (debt: Debt) => {
        setNewDebt({
            name: debt.name.replace(/\(Tháng \d+\/\d+\)|\(Kỳ \d+\)/, '').trim(), // Attempt to strip automatic suffix if needed
            source: debt.source,
            totalAmount: debt.totalAmount,
            dueDate: debt.dueDate.toISOString().slice(0, 10),
            targetMonth: debt.targetMonth ?? debt.dueDate.getMonth(),
            targetYear: debt.targetYear ?? debt.dueDate.getFullYear()
        });
        // When editing, we typically edit a specific instance, so we disable recurring/shopee specific create logic
        setIsRecurringDebt(false);
        setDebtType('standard'); 
        setEditingDebtId(debt.id);
        setDebtModalOpen(true);
    };

    const handleDeleteDebt = (id: string) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa khoản nợ này không?")) {
            setDebts(prev => prev.filter(d => d.id !== id));
            setDebtModalOpen(false);
            setEditingDebtId(null);
        }
    };
    
    const handleAddPayment = (id: string, amount: number) => {
        setDebts(prev => prev.map(d => {
            if (d.id === id) {
                const newTransaction: DebtTransaction = {
                    id: Date.now().toString(),
                    date: new Date(),
                    amount: amount,
                    type: 'payment'
                };
                return {
                    ...d,
                    amountPaid: d.amountPaid + amount,
                    transactions: [...(d.transactions || []), newTransaction]
                };
            }
            return d;
        }));
    };

    const handleWithdrawPayment = (id: string, amount: number, reason: string) => {
        setDebts(prev => prev.map(d => {
            if (d.id === id) {
                const newTransaction: DebtTransaction = {
                    id: Date.now().toString(),
                    date: new Date(),
                    amount: amount, // Store as positive number for display logic, separate type handles sign
                    type: 'withdrawal',
                    reason: reason
                };
                return {
                    ...d,
                    amountPaid: Math.max(0, d.amountPaid - amount),
                    transactions: [...(d.transactions || []), newTransaction]
                };
            }
            return d;
        }));
    };
    
    const handleAddMiscLog = (e: React.FormEvent) => {
        e.preventDefault();
        const log: ExpenseLog = {
            id: Date.now().toString(),
            name: newMiscLog.name,
            amount: newMiscLog.amount,
            date: new Date(newMiscLog.date)
        };
        setMiscLogs(prev => [...prev, log]);
        setActualMiscSpending(prev => prev + log.amount); // Automatically update total
        setNewMiscLog({ name: '', amount: 0, date: new Date().toISOString().slice(0, 10) });
    };
    
    const handleDeleteMiscLog = (id: string, amount: number) => {
        setMiscLogs(prev => prev.filter(log => log.id !== id));
        setActualMiscSpending(prev => Math.max(0, prev - amount));
    };

    const filteredGasHistory = useMemo(() => gasHistory.filter(g => isDateInFilter(g.date, filter)), [gasHistory, filter]);
    
    const getFilterDisplay = () => {
        switch (filter.type) {
            case 'week':
                const { start, end } = getWeekRange(filter.year, filter.week!);
                return `Tuần ${filter.week} (${formatDate(start)} - ${formatDate(end)})`;
            case 'month':
                return `${MONTH_NAMES[filter.month!]}, ${filter.year}`;
            case 'year':
                return `Năm ${filter.year}`;
            case 'all':
            default:
                return 'Tất cả';
        }
    };

    // Determine day description for recurring
    const recurringDayDescription = useMemo(() => {
        if (!newDebt.dueDate) return '';
        const date = new Date(newDebt.dueDate);
        if (recurringFrequency === 'monthly') {
            return `ngày ${date.getDate()} hàng tháng`;
        } else {
            const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            return `${days[date.getDay()]} hàng tuần`;
        }
    }, [newDebt.dueDate, recurringFrequency]);

    // Shopee Due Date Preview
    const shopeeDueDatePreview = useMemo(() => {
         let dueMonth = shopeeBillMonth + 1;
         let dueYear = shopeeBillYear;
         if (dueMonth > 11) {
             dueMonth = 0;
             dueYear = dueYear + 1;
         }
         return new Date(dueYear, dueMonth, 10);
    }, [shopeeBillMonth, shopeeBillYear]);


    return (
        <div className={`min-h-screen ${seasonalTheme.background} ${seasonalTheme.primaryTextColor} font-sans p-4 sm:p-6 lg:p-8 relative z-0`}>
            {seasonalTheme.decorations}
            <div className="max-w-5xl mx-auto relative z-10">
                <Header theme={seasonalTheme} />

                 <div className="mb-6">
                    <button onClick={() => setFilterModalOpen(true)} className={`${seasonalTheme.cardBg} w-full text-left px-4 py-3 rounded-lg shadow-md flex items-center justify-between hover:bg-black/40 transition-colors`}>
                        <span className={`flex items-center gap-2 font-semibold ${seasonalTheme.primaryTextColor}`}>
                            <FilterIcon />
                            Bộ lọc Tổng quan:
                        </span>
                        <span className={`font-medium ${seasonalTheme.primaryTextColor}`}>{getFilterDisplay()}</span>
                    </button>
                </div>

                {/* Actual Spending Hero Card */}
                <div className="mb-6">
                    <div className={`${seasonalTheme.cardBg} p-6 rounded-xl shadow-lg border border-blue-500/30 flex items-center justify-between relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/20 rounded-full blur-xl"></div>
                        <div className="relative z-10">
                             <p className={`text-lg ${seasonalTheme.secondaryTextColor} mb-1`}>Tổng chi tiêu thực tế tuần này</p>
                             <p className={`text-5xl font-bold ${seasonalTheme.primaryTextColor} tracking-tight`}>
                                {Math.round(totalActualSpending).toLocaleString('vi-VN')}đ
                             </p>
                             <p className="text-sm text-blue-300 mt-2 flex items-center gap-1">
                                 <PiggyBankIcon /> Đã bao gồm các khoản cố định và trả nợ
                             </p>
                        </div>
                        <div className="hidden md:block text-6xl text-blue-500/30">
                            <PiggyBankIcon />
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                     <StatCard icon={<TargetIcon />} title="Thu nhập cần đạt" value={`${Math.round(totalPlannedSpending).toLocaleString('vi-VN')}đ`} color="text-amber-400" theme={seasonalTheme} subtitle="Dựa trên ngân sách" />
                     <StatCard icon={<CreditCardIcon />} title="Góp nợ tuần" value={`${Math.round(weeklyDebtContribution).toLocaleString('vi-VN')}đ`} color="text-pink-400" theme={seasonalTheme} subtitle="Tự động tính toán" />
                     <StatCard icon={<MoneyBillIcon />} title="Thu nhập thực tế" value={`${weeklyIncome.toLocaleString('vi-VN')}đ`} color="text-emerald-400" theme={seasonalTheme} />
                     <StatCard icon={<ChartLineIcon />} title="Tình trạng tài chính" value={`${financialStatus.toLocaleString('vi-VN')}đ`} color={financialStatus >= 0 ? "text-green-400" : "text-red-400"} subtitle={financialStatus >= 0 ? "Dư giả" : "Thiếu hụt"} theme={seasonalTheme} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                         <div className={`${seasonalTheme.cardBg} p-5 rounded-lg shadow-lg`}>
                            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                                <h3 className={`text-xl font-bold ${seasonalTheme.primaryTextColor}`}>Chi tiêu & Ngân sách</h3>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleMomoConnect}
                                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-colors border ${isMomoConnected ? 'bg-pink-900/30 border-pink-500 text-pink-300' : 'bg-transparent border-gray-500 text-gray-400 hover:border-pink-500 hover:text-pink-400'}`}
                                    >
                                        <MomoIcon className="w-3 h-3" />
                                        {isMomoConnected ? 'Đã liên kết' : 'Liên kết Momo'}
                                    </button>
                                    {isMomoConnected && (
                                        <button 
                                            onClick={handleSyncMomo}
                                            disabled={isSyncing}
                                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-colors border bg-blue-900/30 border-blue-500 text-blue-300 hover:bg-blue-800/50 ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <RefreshIcon className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                                            {isSyncing ? 'Đang quét...' : 'Đồng bộ'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-black/20 rounded-md">
                                    <div className="flex items-center">
                                        <GasPumpIcon className="text-red-400 mr-3" />
                                        <div>
                                            <p className={`font-semibold ${seasonalTheme.primaryTextColor}`}>Xăng</p>
                                            <p className={`text-xs ${seasonalTheme.secondaryTextColor}`}>{lastGasFill ? `Đổ gần nhất: ${formatDate(lastGasFill.date)}` : 'Chưa có dữ liệu'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-3">
                                        <p className={`font-bold ${seasonalTheme.primaryTextColor}`}>{GAS_COST.toLocaleString('vi-VN')}đ</p>
                                        <button onClick={handleToggleGas} className={`text-2xl transition-all transform active:scale-90 focus:outline-none ${isGasFilledToday ? 'text-green-400' : 'text-gray-600 hover:text-gray-400'}`} title={isGasFilledToday ? "Bỏ đánh dấu" : "Đánh dấu đã đổ"}>
                                            {isGasFilledToday ? <CheckCircleIcon /> : <CircleIcon />}
                                        </button>
                                    </div>
                                </div>
                                {gasDurationComparison && (
                                     <div className={`p-2 rounded-md text-sm ${gasDurationComparison.isShorter ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                                        <WarningIcon className="inline mr-1" />
                                        Đợt gần nhất kéo dài {gasDurationComparison.lastDuration} ngày. {gasDurationComparison.isShorter ? 'Ngắn hơn bình thường!' : 'Tốt!'}
                                     </div>
                                )}

                                <div className="flex items-center justify-between p-3 bg-black/20 rounded-md">
                                    <div className="flex items-center">
                                        <WifiIcon className="text-blue-400 mr-3" />
                                        <div>
                                            <p className={`font-semibold ${seasonalTheme.primaryTextColor}`}>Wifi</p>
                                             <p className={`text-xs ${seasonalTheme.secondaryTextColor}`}>{lastWifiPayment ? `Hết hạn: ${formatDate(new Date(lastWifiPayment.getTime() + 7 * 24 * 60 * 60 * 1000))}` : 'Chưa nạp'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-3">
                                        <p className={`font-bold ${seasonalTheme.primaryTextColor}`}>{WIFI_COST.toLocaleString('vi-VN')}đ</p>
                                        <button onClick={handleToggleWifi} className={`text-2xl transition-all transform active:scale-90 focus:outline-none ${isWifiPaidRecently ? 'text-green-400' : 'text-gray-600 hover:text-gray-400'}`} title={isWifiPaidRecently ? "Bỏ đánh dấu" : "Đánh dấu đã nạp"}>
                                            {isWifiPaidRecently ? <CheckCircleIcon /> : <CircleIcon />}
                                        </button>
                                    </div>
                                </div>
                                {wifiWarning && (
                                    <div className="p-2 rounded-md text-sm bg-yellow-500/20 text-yellow-300">
                                        <WarningIcon className="inline mr-1" />
                                        Sắp hết hạn Wifi, hãy nạp thêm!
                                    </div>
                                )}

                                <BudgetRow 
                                    icon={<FoodIcon />}
                                    label="Ăn uống"
                                    budget={foodBudget}
                                    actual={actualFoodSpending}
                                    onBudgetChange={setFoodBudget}
                                    onActualChange={setActualFoodSpending}
                                    theme={seasonalTheme}
                                    colorClass="text-orange-400"
                                />

                                <BudgetRow 
                                    icon={<BoltIcon />}
                                    label="Phát sinh"
                                    budget={miscBudget}
                                    actual={actualMiscSpending}
                                    onBudgetChange={setMiscBudget}
                                    onActualChange={setActualMiscSpending}
                                    theme={seasonalTheme}
                                    colorClass="text-purple-400"
                                    onDetailClick={() => setMiscDetailOpen(true)}
                                />
                            </div>
                        </div>

                         <div className={`${seasonalTheme.cardBg} p-5 rounded-lg shadow-lg`}>
                             <h3 className={`text-xl font-bold mb-4 ${seasonalTheme.primaryTextColor}`}>Cập nhật thu nhập tuần</h3>
                             <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <CurrencyInput 
                                        value={incomeInput}
                                        onValueChange={setIncomeInput}
                                        className="w-full input"
                                        placeholder="0"
                                    />
                                </div>
                                <button 
                                    onClick={handleUpdateIncome}
                                    className={`px-4 py-2.5 rounded-md font-semibold ${seasonalTheme.accentColor} hover:opacity-90 transition text-slate-900 flex items-center gap-2`}
                                >
                                    <SaveIcon /> Cập nhật
                                </button>
                             </div>
                             {financialStatus < 0 && (
                                <div className="mt-4 p-4 rounded-lg bg-red-900/40 border border-red-500/30 flex items-center gap-4">
                                    <img src={sadDogImageBase64} alt="Chó buồn" className="w-24 h-24 object-contain rounded-lg flex-shrink-0" />
                                    <div className="text-red-200">
                                        <p className="font-semibold text-base">"Sao... ngân sách của em lại âm?"</p>
                                        <p className="mt-2 text-sm">Bạn đang thiếu hụt <strong>{Math.abs(financialStatus).toLocaleString('vi-VN')}đ</strong>.</p>
                                        <p className="mt-1 text-xs">Để "dỗ" lại ví tiền, bạn cần làm thêm khoảng <strong>{Math.ceil(Math.abs(financialStatus) / 100000)} ca</strong> (5h/ca).</p>
                                    </div>
                                </div>
                             )}
                              {financialStatus >= 0 && weeklyIncome > 0 && (
                                <div className="mt-3 p-3 rounded-md text-sm bg-green-500/20 text-green-300">
                                    <p><CheckIcon className="inline mr-1" />Bạn đang làm rất tốt!</p>
                                    <p className="mt-1">Với thu nhập hiện tại, bạn có thể nghỉ ngơi tối đa <strong>{daysOffCanTake === Infinity ? 'vô hạn' : daysOffCanTake} ngày</strong> mà vẫn đảm bảo tài chính.</p>
                                </div>
                             )}
                         </div>

                         <div className={`${seasonalTheme.cardBg} p-5 rounded-lg shadow-lg`}>
                            <h3 className={`text-xl font-bold mb-4 ${seasonalTheme.primaryTextColor}`}>Lịch sử đổ xăng</h3>
                            <div className="max-h-60 overflow-y-auto pr-2">
                               {filteredGasHistory.length > 0 ? (
                                    [...filteredGasHistory].reverse().map(log => (
                                        <div key={log.id} className={`text-sm ${seasonalTheme.secondaryTextColor} p-2 bg-black/20 rounded mb-2`}>
                                            {formatDateTime(log.date)}
                                        </div>
                                    ))
                                ) : (
                                    <p className={`text-sm ${seasonalTheme.secondaryTextColor}`}>Không có dữ liệu nào khớp với bộ lọc của bạn.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                         <div className={`${seasonalTheme.cardBg} p-5 rounded-lg shadow-lg`}>
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
                               <div className="flex items-center gap-2">
                                   <h3 className={`text-xl font-bold ${seasonalTheme.primaryTextColor}`}>Nợ cần trả</h3>
                                   <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-1 border border-slate-700">
                                       <select 
                                            value={debtFilterMonth} 
                                            onChange={(e) => setDebtFilterMonth(parseInt(e.target.value))}
                                            className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
                                       >
                                           {MONTH_NAMES.map((m, idx) => <option key={idx} value={idx} className="bg-slate-900">{m}</option>)}
                                       </select>
                                       <input 
                                            type="number" 
                                            value={debtFilterYear}
                                            onChange={(e) => setDebtFilterYear(parseInt(e.target.value))}
                                            className="bg-transparent text-sm font-semibold text-white w-16 focus:outline-none"
                                       />
                                   </div>
                               </div>
                               <div className="flex gap-2">
                                   <button onClick={() => setDebtHistoryOpen(true)} className="px-3 py-2 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg shadow-md transition flex items-center gap-1">
                                       <HistoryIcon /> Lịch sử đã trả
                                   </button>
                                   <button onClick={() => {
                                       setNewDebt({ 
                                            name: '', 
                                            source: '', 
                                            totalAmount: 0, 
                                            dueDate: new Date().toISOString().slice(0, 10),
                                            targetMonth: debtFilterMonth,
                                            targetYear: debtFilterYear
                                        });
                                        setEditingDebtId(null);
                                        setIsRecurringDebt(false);
                                        setDebtModalOpen(true);
                                   }} className={`px-4 py-2 text-sm font-semibold text-slate-900 rounded-lg shadow-md hover:opacity-80 transition ${seasonalTheme.accentColor}`}>
                                       <PlusIcon className="inline mr-1"/> Thêm khoản nợ
                                   </button>
                               </div>
                            </div>
                            <div className="max-h-[70vh] overflow-y-auto pr-2">
                                {displayDebts.length > 0 ? (
                                    displayDebts.map(debt => (
                                        <DebtItem 
                                            key={debt.id} 
                                            debt={debt} 
                                            onAddPayment={handleAddPayment}
                                            onWithdrawPayment={handleWithdrawPayment}
                                            onEdit={handleEditDebt} 
                                            theme={seasonalTheme} 
                                        />
                                    ))
                                ) : (
                                    <div className={`text-center ${seasonalTheme.secondaryTextColor} py-8 border-2 border-dashed border-slate-700 rounded-xl`}>
                                        <p>Không có khoản nợ nào được tính vào tháng này.</p>
                                        <p className="text-xs mt-1">Hãy kiểm tra "Lịch sử đã trả" hoặc thêm khoản nợ mới cho tháng này.</p>
                                    </div>
                                )}
                            </div>
                         </div>
                    </div>
                </div>

                <FilterModal 
                    isOpen={isFilterModalOpen} 
                    onClose={() => setFilterModalOpen(false)} 
                    onApply={setFilter}
                    currentFilter={filter}
                />

                {/* Debt Modal (Add & Edit) */}
                {isDebtModalOpen && (
                     <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-md relative animate-fade-in-up">
                           <form onSubmit={handleSaveDebt}>
                               <h3 className={`text-2xl font-bold mb-4 ${seasonalTheme.primaryTextColor}`}>
                                   {editingDebtId ? "Chỉnh sửa khoản nợ" : "Thêm khoản nợ mới"}
                               </h3>
                               
                               {!editingDebtId && (
                                   <div className="flex border-b border-slate-700 mb-4">
                                       <button 
                                            type="button"
                                            onClick={() => setDebtType('standard')}
                                            className={`flex-1 py-2 text-sm font-semibold transition-colors border-b-2 ${debtType === 'standard' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                                       >
                                           Nợ thông thường
                                       </button>
                                       <button 
                                            type="button"
                                            onClick={() => setDebtType('shopee')}
                                            className={`flex-1 py-2 text-sm font-semibold transition-colors border-b-2 ${debtType === 'shopee' ? 'border-orange-500 text-orange-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                                       >
                                           Shopee SPayLater
                                       </button>
                                   </div>
                               )}

                               {debtType === 'standard' ? (
                                   // STANDARD DEBT FORM
                                   <div className="space-y-4">
                                       <div>
                                           <label className="block text-sm font-medium text-slate-300 mb-1">Tên khoản nợ</label>
                                           <input type="text" value={newDebt.name} onChange={e => setNewDebt({...newDebt, name: e.target.value})} className="w-full input" required />
                                       </div>
                                        <div>
                                           <label className="block text-sm font-medium text-slate-300 mb-1">Nguồn nợ</label>
                                           <input type="text" value={newDebt.source} onChange={e => setNewDebt({...newDebt, source: e.target.value})} className="w-full input" required />
                                       </div>
                                       
                                       {/* Recurring Toggle - Only show when adding new */}
                                       {!editingDebtId && (
                                           <div className="flex items-center gap-2 p-3 rounded bg-slate-800/50 border border-slate-600">
                                                <input 
                                                    type="checkbox" 
                                                    id="recurringDebt" 
                                                    checked={isRecurringDebt} 
                                                    onChange={e => setIsRecurringDebt(e.target.checked)}
                                                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-700 border-slate-500"
                                                />
                                                <label htmlFor="recurringDebt" className="text-sm font-medium text-slate-200 flex items-center gap-2 cursor-pointer select-none">
                                                    <RepeatIcon className="text-amber-400" />
                                                    Khoản nợ lặp lại (Trả góp)
                                                </label>
                                           </div>
                                       )}
                                       
                                       {/* Due Date */}
                                       <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                                {isRecurringDebt ? 'Ngày bắt đầu (Hạn trả kỳ đầu tiên)' : 'Ngày đến hạn trả'}
                                            </label>
                                            <input type="date" value={newDebt.dueDate} onChange={e => setNewDebt({...newDebt, dueDate: e.target.value})} className="w-full input" required />
                                       </div>
    
                                        {isRecurringDebt && (
                                            <div className="p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg space-y-3 animate-fade-in-up">
                                                <div>
                                                    <label className="block text-xs font-bold text-amber-400 uppercase mb-1">Tần suất lặp lại</label>
                                                    <select 
                                                        value={recurringFrequency}
                                                        onChange={(e) => setRecurringFrequency(e.target.value as 'weekly' | 'monthly')}
                                                        className="w-full input"
                                                    >
                                                        <option value="monthly">Mỗi tháng</option>
                                                        <option value="weekly">Mỗi tuần</option>
                                                    </select>
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-xs font-bold text-amber-400 uppercase mb-1">Lặp lại đến ngày</label>
                                                    <input 
                                                        type="date" 
                                                        value={recurringEndDate} 
                                                        onChange={e => setRecurringEndDate(e.target.value)} 
                                                        className="w-full input" 
                                                        required 
                                                    />
                                                </div>
                                                
                                                {newDebt.dueDate && recurringEndDate && (
                                                    <div className="text-xs text-amber-200/70 italic border-t border-amber-500/20 pt-2">
                                                        Sẽ lặp lại vào <strong>{recurringDayDescription}</strong> kể từ ngày bắt đầu đến khi kết thúc vào {formatDate(new Date(recurringEndDate))}.
                                                    </div>
                                                )}
                                            </div>
                                        )}
    
                                        <div>
                                           <label className="block text-sm font-medium text-slate-300 mb-1">
                                               {isRecurringDebt ? 'Số tiền phải trả mỗi kỳ' : 'Tổng số tiền'}
                                           </label>
                                           <CurrencyInput value={newDebt.totalAmount} onValueChange={val => setNewDebt({...newDebt, totalAmount: val})} className="w-full input" required />
                                       </div>
                                       
                                       {!isRecurringDebt && (
                                           <div className="pt-2 border-t border-slate-700 mt-2">
                                                <label className="block text-sm font-medium text-amber-400 mb-2">
                                                    Tính vào ngân sách chi tiêu tháng:
                                                </label>
                                                <div className="flex gap-2">
                                                    <select 
                                                        value={newDebt.targetMonth} 
                                                        onChange={e => setNewDebt({...newDebt, targetMonth: parseInt(e.target.value)})}
                                                        className="flex-1 input py-2 cursor-pointer"
                                                    >
                                                        {MONTH_NAMES.map((m, idx) => <option key={idx} value={idx} className="text-slate-900">{m}</option>)}
                                                    </select>
                                                    <input 
                                                        type="number" 
                                                        value={newDebt.targetYear} 
                                                        onChange={e => setNewDebt({...newDebt, targetYear: parseInt(e.target.value)})}
                                                        className="w-24 input py-2"
                                                        placeholder="Năm"
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1 italic">Nợ sẽ hiển thị khi bạn chọn bộ lọc nợ của tháng này.</p>
                                           </div>
                                       )}
                                   </div>
                               ) : (
                                   // SHOPEE SPAYLATER FORM
                                   <div className="space-y-5 animate-fade-in-up">
                                        <div className="flex items-center gap-3 bg-orange-500/10 p-3 rounded-lg border border-orange-500/30 text-orange-300">
                                            <ShoppingBagIcon className="text-2xl" />
                                            <div>
                                                <p className="font-bold text-sm">Shopee SPayLater</p>
                                                <p className="text-xs opacity-80">Tự động tạo hạn thanh toán ngày 10 tháng sau.</p>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-sm font-medium text-slate-300">Hóa đơn của tháng</label>
                                                <input 
                                                    type="number" 
                                                    value={shopeeBillYear} 
                                                    onChange={e => setShopeeBillYear(parseInt(e.target.value))}
                                                    className="input py-1 px-2 w-20 text-center text-sm"
                                                />
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                                {MONTH_NAMES.map((m, idx) => (
                                                    <button
                                                        type="button"
                                                        key={idx}
                                                        onClick={() => setShopeeBillMonth(idx)}
                                                        className={`p-2 rounded text-xs font-semibold transition-all ${shopeeBillMonth === idx ? 'bg-orange-500 text-white ring-2 ring-orange-300' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                                    >
                                                        {m.replace('Tháng ', 'T')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                           <label className="block text-sm font-medium text-slate-300 mb-1">Số tiền cần thanh toán</label>
                                           <CurrencyInput value={newDebt.totalAmount} onValueChange={val => setNewDebt({...newDebt, totalAmount: val})} className="w-full input" required />
                                       </div>

                                       <div className="p-3 bg-slate-800 rounded text-sm text-slate-300">
                                           <p>Hạn thanh toán dự kiến: <span className="text-orange-400 font-bold">{formatDate(shopeeDueDatePreview)}</span></p>
                                           <p className="text-xs mt-1 text-slate-500">Khoản nợ này sẽ được tính vào ngân sách tháng {shopeeDueDatePreview.getMonth() + 1}/{shopeeDueDatePreview.getFullYear()}.</p>
                                       </div>
                                   </div>
                               )}

                               <div className="mt-6 flex justify-end gap-3">
                                   {editingDebtId && (
                                       <button 
                                            type="button"
                                            onClick={() => handleDeleteDebt(editingDebtId)}
                                            className="px-4 py-2 rounded bg-red-900/50 text-red-400 hover:bg-red-900/80 mr-auto"
                                       >
                                           <TrashIcon /> Xóa
                                       </button>
                                   )}
                                   <button type="button" onClick={() => setDebtModalOpen(false)} className="px-4 py-2 rounded bg-slate-700 text-slate-300 hover:bg-slate-600">Hủy</button>
                                   <button type="submit" className={`px-6 py-2 rounded font-bold text-slate-900 shadow-lg hover:opacity-90 ${seasonalTheme.accentColor}`}>
                                       {editingDebtId ? 'Cập nhật' : 'Thêm'}
                                   </button>
                               </div>
                           </form>
                           <button onClick={() => setDebtModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                               <CloseIcon />
                           </button>
                        </div>
                     </div>
                )}

                {/* Momo Sync Modal */}
                {isMomoSyncModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up">
                            <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                                <MomoIcon className="w-6 h-6" /> Đồng bộ từ Momo
                            </h3>
                            <p className="text-sm text-slate-400 mb-4">Tìm thấy {foundTransactions.length} giao dịch gần đây:</p>
                            
                            <div className="max-h-60 overflow-y-auto space-y-2 mb-4 pr-2">
                                {foundTransactions.map(t => (
                                    <div 
                                        key={t.id} 
                                        onClick={() => toggleTransactionSelection(t.id)}
                                        className={`p-3 rounded-lg cursor-pointer border transition-all ${t.isSelected ? 'bg-pink-900/20 border-pink-500' : 'bg-slate-800 border-transparent hover:border-slate-600'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold text-white">{t.description}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-pink-400">{t.amount.toLocaleString('vi-VN')}đ</span>
                                                {t.isSelected ? <CheckCircleIcon className="text-pink-500"/> : <CircleIcon className="text-slate-600"/>}
                                            </div>
                                        </div>
                                        <div className="flex justify-between mt-1 text-xs text-slate-500">
                                            <span>{formatDate(t.date)}</span>
                                            <span className="uppercase bg-slate-700 px-1 rounded">{t.category === 'food' ? 'Ăn uống' : 'Phát sinh'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex gap-3">
                                <button onClick={() => setMomoSyncModalOpen(false)} className="flex-1 py-2 rounded bg-slate-700 text-slate-300">Bỏ qua</button>
                                <button onClick={handleImportMomoTransactions} className="flex-1 py-2 rounded bg-pink-600 text-white font-bold hover:bg-pink-500 flex items-center justify-center gap-2">
                                    <ArrowDownIcon /> Nhập {foundTransactions.filter(t => t.isSelected).length} mục
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Debt History Modal */}
                {isDebtHistoryOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-lg relative animate-fade-in-up">
                             <h3 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
                                <HistoryIcon className="text-slate-400" /> Lịch sử nợ đã trả
                            </h3>
                             <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
                                {completedDebts.length > 0 ? (
                                    completedDebts.map(debt => (
                                        <div key={debt.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 opacity-70 hover:opacity-100 transition">
                                            <div className="flex justify-between">
                                                <h4 className="font-bold text-slate-300 line-through">{debt.name}</h4>
                                                <span className="text-green-400 font-bold text-sm">Đã trả xong</span>
                                            </div>
                                            <p className="text-sm text-slate-500">Nguồn: {debt.source}</p>
                                            <div className="mt-2 flex justify-between text-xs text-slate-400">
                                                <span>Tổng: {debt.totalAmount.toLocaleString('vi-VN')}đ</span>
                                                <span>Hạn: {formatDate(debt.dueDate)}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-slate-500 py-8">Chưa có khoản nợ nào được trả hết.</p>
                                )}
                             </div>
                             <button onClick={() => setDebtHistoryOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                                <CloseIcon />
                            </button>
                        </div>
                    </div>
                )}

                {/* Misc Expenses Detail Modal */}
                {isMiscDetailOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
                         <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-lg relative animate-fade-in-up h-[80vh] flex flex-col">
                            <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2 flex-shrink-0">
                                <ListIcon className="text-purple-400" /> Chi tiết khoản chi phát sinh
                            </h3>
                            
                            <div className="flex-1 overflow-y-auto pr-2 mb-4 space-y-2 border-b border-slate-700 pb-4">
                                {miscLogs.length > 0 ? (
                                    miscLogs.slice().reverse().map(log => (
                                        <div key={log.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg group hover:bg-slate-750">
                                            <div>
                                                <p className="font-semibold text-slate-200">{log.name}</p>
                                                <p className="text-xs text-slate-500">{formatDate(log.date)}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-purple-400">{log.amount.toLocaleString('vi-VN')}đ</span>
                                                <button 
                                                    onClick={() => handleDeleteMiscLog(log.id, log.amount)}
                                                    className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-slate-500 py-8">Chưa có mục chi tiết nào.</p>
                                )}
                            </div>

                            <div className="flex-shrink-0 pt-2">
                                <h4 className="text-sm font-bold text-slate-400 mb-3">Thêm mục mới</h4>
                                <form onSubmit={handleAddMiscLog} className="space-y-3">
                                    <div>
                                        <input 
                                            type="text" 
                                            placeholder="Tên khoản chi (VD: Trà sữa)" 
                                            className="input w-full text-sm"
                                            value={newMiscLog.name}
                                            onChange={e => setNewMiscLog({...newMiscLog, name: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                             <CurrencyInput 
                                                value={newMiscLog.amount} 
                                                onValueChange={val => setNewMiscLog({...newMiscLog, amount: val})}
                                                className="input w-full text-sm"
                                                placeholder="Số tiền"
                                                required
                                            />
                                        </div>
                                        <div className="w-1/3">
                                            <input 
                                                type="date" 
                                                className="input w-full text-sm"
                                                value={newMiscLog.date}
                                                onChange={e => setNewMiscLog({...newMiscLog, date: e.target.value})}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full py-2 rounded bg-purple-600 text-white font-bold hover:bg-purple-500 transition">
                                        <PlusIcon className="mr-1" /> Thêm
                                    </button>
                                </form>
                            </div>

                            <button onClick={() => setMiscDetailOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                                <CloseIcon />
                            </button>
                         </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default App;
