import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import Navbar from './Navbar';

const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

export default function AdminLayout({ children }) {
  // Desktop: sidebar terbuka. Ponsel/tablet: tertutup agar halaman langsung terlihat.
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  const { pathname } = useLocation();

  // Di layar kecil sidebar menutup otomatis setelah berpindah halaman.
  useEffect(() => {
    if (!isDesktop()) setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-dark-primary">
      <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}