import React from 'react';
import {
  CalendarCheck,
  CalendarDays,
  Scale,
  ListTodo,
  Clock,
  ArrowLeftRight,
  MessageSquareWarning,
  Settings
} from 'lucide-react';

export function BottomNav({
  activeScreen,
  onChangeScreen,
  pendingSwapsCount = 0,
  unreadFeedbacksCount = 0
}) {
  const navItems = [
    { id: 'today', label: 'Hoje', icon: CalendarCheck },
    { id: 'week', label: 'Semana', icon: CalendarDays },
    { id: 'balance', label: 'Equilíbrio', icon: Scale },
    { id: 'tasks', label: 'Tarefas', icon: ListTodo },
    {
      id: 'feedbacks',
      label: 'Desabafos',
      icon: MessageSquareWarning,
      badge: unreadFeedbacksCount > 0 ? unreadFeedbacksCount : null
    },
    {
      id: 'swaps',
      label: 'Trocas',
      icon: ArrowLeftRight,
      badge: pendingSwapsCount > 0 ? pendingSwapsCount : null
    },
    { id: 'settings', label: 'Ajustes', icon: Settings }
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegação Principal">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = activeScreen === item.id;

        return (
          <button
            key={item.id}
            id={`nav-btn-${item.id}`}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onChangeScreen(item.id)}
            title={item.label}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconComponent size={18} strokeWidth={isActive ? 2.5 : 2} />
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </div>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
