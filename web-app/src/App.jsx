import React from 'react';
import { Outlet } from 'react-router-dom';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Outlet />
    </div>
  );
}
