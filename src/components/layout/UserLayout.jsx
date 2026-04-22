import { useState } from 'react';
import UserSidebar from './UserSidebar';
import Navbar from './Navbar';

export default function UserLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-dark-primary">
      <UserSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}