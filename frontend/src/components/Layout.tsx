import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

interface SidebarProps {
  children: React.ReactNode;
}

interface MainContentProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="app-layout">
      {children}
    </div>
  );
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="app-sidebar">
      {children}
    </aside>
  );
}

export function MainContent({ children }: MainContentProps) {
  return (
    <main className="app-main">
      {children}
    </main>
  );
}
