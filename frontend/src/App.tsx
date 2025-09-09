import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Outlets from './pages/Outlets';
import Machines from './pages/Machines';
import Charts from './pages/Charts';
import { Layout, Sidebar, MainContent } from './components/Layout';
import { Home, Building2, Cpu, BarChart3, LogOut } from 'lucide-react';
import './App.css';

type Page = 'dashboard' | 'outlets' | 'machines' | 'charts';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setLoggedIn(true);
    } else {
      alert('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setCurrentPage('dashboard');
  };

  useEffect(() => {
    // Listen for navigation events from dashboard charts
    const handleNavigateToCharts = () => {
      setCurrentPage('charts');
    };

    window.addEventListener('navigateToCharts', handleNavigateToCharts);
    
    return () => {
      window.removeEventListener('navigateToCharts', handleNavigateToCharts);
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'outlets':
        return <Outlets />;
      case 'machines':
        return <Machines />;
      case 'charts':
        return <Charts />;
      default:
        return <Dashboard />;
    }
  };

  if (loggedIn) {
    return (
      <Layout>
        <Sidebar>
          <div className="sidebar-header">
            <h2>Ozone Telemetry</h2>
          </div>
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentPage('dashboard')}
            >
              <Home size={20} />
              Dashboard
            </button>
            <button 
              className={`nav-item ${currentPage === 'outlets' ? 'active' : ''}`}
              onClick={() => setCurrentPage('outlets')}
            >
              <Building2 size={20} />
              Outlets
            </button>
            <button
              className={`nav-item ${currentPage === 'machines' ? 'active' : ''}`}
              onClick={() => setCurrentPage('machines')}
            >
              <Cpu size={20} />
              Machines
            </button>
            <button
              className={`nav-item ${currentPage === 'charts' ? 'active' : ''}`}
              onClick={() => setCurrentPage('charts')}
            >
              <BarChart3 size={20} />
              Charts
            </button>
          </nav>
          <div className="sidebar-footer">
            <button className="nav-item logout" onClick={handleLogout}>
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </Sidebar>
        <MainContent>
          {renderPage()}
        </MainContent>
      </Layout>
    );
  }

  return (
    <div className="app" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
      <div className="card" style={{width: 360}}>
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <label>
              <div>Username</div>
              <input value={username} onChange={(e)=>setUsername(e.target.value)} className="device-select" />
            </label>
            <label>
              <div>Password</div>
              <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="device-select" />
            </label>
            <button className="btn btn-primary" type="submit">Login</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
