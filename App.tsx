
import React, { useState, useCallback } from 'react';
import { Waypoint } from './types.ts';
import MapComponent from './components/MapComponent.tsx';

const App: React.FC = () => {
  const [userPoints, setUserPoints] = useState<Waypoint[]>([]);
  const [snappedPath, setSnappedPath] = useState<Waypoint[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [duration, setDuration] = useState(2.0);
  const [isRouting, setIsRouting] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchRoute = async (start: Waypoint, end: Waypoint) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/walking/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
      );
      if (!response.ok) throw new Error('OSRM API error');
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes[0].geometry.coordinates.map((coord: [number, number]) => ({
          lat: coord[1],
          lng: coord[0],
        }));
      }
    } catch (error) {
      console.error("Routing error:", error);
    }
    return [end];
  };

  const handleAddWaypoint = useCallback(async (point: Waypoint) => {
    if (isAnimating || isRouting) return;
    
    setShowHelp(false);
    setIsRouting(true);

    try {
      if (userPoints.length === 0) {
        setUserPoints([point]);
        setSnappedPath([point]);
      } else {
        const lastPoint = userPoints[userPoints.length - 1];
        const segment = await fetchRoute(lastPoint, point);
        
        setUserPoints(prev => [...prev, point]);
        setSnappedPath(prev => [...prev, ...segment]);
      }
    } finally {
      setIsRouting(false);
    }
  }, [userPoints, isAnimating, isRouting]);

  const handleClear = () => {
    setUserPoints([]);
    setSnappedPath([]);
    setIsAnimating(false);
    setIsDrawerOpen(false);
  };

  const startAnimation = () => {
    if (snappedPath.length < 2) return;
    setIsAnimating(false);
    if (window.innerWidth < 768) setIsDrawerOpen(false);
    
    setTimeout(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), duration * 1000);
    }, 50);
  };

  const ControlPanel = () => (
    <div className="space-y-8">
      {/* Route Info */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Route Info</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 mb-1">Waypoints</p>
            <p className="text-2xl font-bold text-slate-800">{userPoints.length}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 mb-1">Total Points</p>
            <p className="text-2xl font-bold text-indigo-600">{snappedPath.length}</p>
          </div>
        </div>
      </div>

      {/* Animation Settings */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Animation Settings</h2>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-700">再生時間</label>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{duration.toFixed(1)}s</span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="5.0" 
              step="0.1" 
              value={duration} 
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              disabled={isAnimating}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>高速</span>
              <span>ゆったり</span>
            </div>
          </div>

          <button
            onClick={startAnimation}
            disabled={snappedPath.length < 2 || isAnimating || isRouting}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            アニメーション再生
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between z-[1002] shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">Walk Animator</h1>
        </div>
        <button 
          onClick={handleClear}
          className="text-sm font-medium text-slate-400 hover:text-red-500 transition-colors"
        >
          Clear
        </button>
      </header>

      <main className="flex-1 flex relative">
        {showHelp && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none px-4 text-center">
            <div className="bg-slate-900/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl animate-bounce flex items-center gap-3">
              <span className="text-xl">📍</span>
              <p className="text-xs md:text-sm font-medium">道路をクリックして経路を作成</p>
            </div>
          </div>
        )}

        {isRouting && (
          <div className="absolute bottom-24 md:bottom-8 left-4 md:left-8 z-[1000] bg-white px-4 py-2 rounded-lg shadow-lg border border-slate-100 flex items-center gap-3">
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></div>
            <p className="text-[10px] md:text-xs font-bold text-slate-600">道を検索中...</p>
          </div>
        )}

        <div className="flex-1 relative">
          <MapComponent 
            waypoints={snappedPath} 
            onAddWaypoint={handleAddWaypoint} 
            isAnimating={isAnimating}
            animationDuration={duration}
          />
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-96 bg-white border-l border-slate-200 flex-col shadow-xl z-20 overflow-y-auto shrink-0">
          <div className="p-6">
            <ControlPanel />
          </div>
          <div className="mt-auto p-6 bg-slate-50 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">OSRM Routing</p>
          </div>
        </aside>

        {/* Mobile Bottom Drawer */}
        <div className={`md:hidden fixed inset-x-0 bottom-0 z-[1005] transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'}`}>
          {/* Overlay to close drawer */}
          {isDrawerOpen && (
            <div 
              className="fixed inset-0 bg-black/20 -translate-y-full" 
              onClick={() => setIsDrawerOpen(false)}
            />
          )}
          
          <div className="bg-white rounded-t-[32px] shadow-[0_-8px_30px_rgb(0,0,0,0.12)] border-t border-slate-200">
            {/* Handle/Trigger */}
            <div 
              className="h-20 flex flex-col items-center justify-center cursor-pointer active:bg-slate-50 transition-colors"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-3" />
              <div className="flex items-center gap-3 w-full px-6">
                 <div className="flex-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Route Settings</p>
                    <p className="text-sm font-bold text-slate-800">
                      {userPoints.length > 0 ? `${userPoints.length} points selected` : 'No route created'}
                    </p>
                 </div>
                 <div className="bg-indigo-600 text-white p-2 rounded-full shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform duration-300 ${isDrawerOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                 </div>
              </div>
            </div>

            {/* Content area */}
            <div className="p-6 pt-0 max-h-[70vh] overflow-y-auto">
              <ControlPanel />
              <div className="mt-8 pb-6 text-center">
                 <p className="text-[10px] text-slate-300 font-bold tracking-widest uppercase">Tap above to close settings</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
