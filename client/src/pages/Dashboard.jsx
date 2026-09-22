import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PriceTrendChart from '../components/PriceTrendChart';

let dashboardCache = null;

const Dashboard = () => {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(() => dashboardCache);
  const [loading, setLoading] = useState(() => !dashboardCache);
  const [error, setError] = useState(null);

  const [availableCities, setAvailableCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem('weatherCity') || 'Coimbatore');
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [showAddressTip, setShowAddressTip] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const isFetchingRef = useRef(false);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchCityList();
  }, []);

  const fetchDashboardData = async (forceRefresh = false) => {
    if (isFetchingRef.current && !forceRefresh) return;
    isFetchingRef.current = true;

    if (!dashboardCache || forceRefresh) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await api.get('/dashboard');
      if (res.data && res.data.success) {
        dashboardCache = res.data;
        setDashboardData(res.data);
      } else {
        throw new Error('Failed to retrieve dashboard dataset');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Unable to load dashboard data');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const fetchCityList = async () => {
    try {
      const res = await api.get('/weather/cities');
      if (res.data && res.data.success) {
        setAvailableCities(res.data.cities);
      }
    } catch (err) {
      setAvailableCities([
        { id: 'coimbatore', name: 'Coimbatore' },
        { id: 'delhi', name: 'Delhi' },
        { id: 'mumbai', name: 'Mumbai' },
        { id: 'chennai', name: 'Chennai' },
        { id: 'kolkata', name: 'Kolkata' },
        { id: 'bangalore', name: 'Bangalore' },
        { id: 'hyderabad', name: 'Hyderabad' },
        { id: 'pune', name: 'Pune' },
        { id: 'amritsar', name: 'Amritsar' },
        { id: 'ludhiana', name: 'Ludhiana' }
      ]);
    }
  };

  const handleCityChange = async (cityName) => {
    setSelectedCity(cityName);
    localStorage.setItem('weatherCity', cityName);
    setWeatherLoading(true);
    try {
      const res = await api.get(`/weather?city=${encodeURIComponent(cityName)}`);
      if (res.data) {
        setDashboardData(prev => {
          const updated = { ...prev, weather: res.data };
          dashboardCache = updated;
          return updated;
        });
        showToast({
          title: 'Data refreshed',
          message: `Weather updated for ${cityName}.`,
          type: 'success'
        });
      }
    } catch (err) {
      console.error('Error fetching city weather:', err);
      showToast({
        title: 'Network error',
        message: 'Could not fetch weather for selected location.',
        type: 'error'
      });
    } finally {
      setWeatherLoading(false);
    }
  };

  const formatUserDateTime = (dateInput) => {
    if (!dateInput) return 'N/A';
    try {
      const d = new Date(dateInput);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(dateInput);
    }
  };

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const formattedTimeStr = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const weather = dashboardData?.weather || {
    city: 'Coimbatore',
    temperature: 28,
    humidity: 65,
    status: 'Partly Cloudy',
    icon: 'fa-cloud-sun',
    windSpeed: 12,
    rainProbability: 20
  };

  const cropAdvisories = dashboardData?.cropAdvisories || { total: 0, latest: null, recent: [] };
  const cropPrices = dashboardData?.cropPrices || { availableCrops: 0, latest: [] };
  const farmerNews = dashboardData?.farmerNews || { total: 0, latest: [] };
  const activities = dashboardData?.activity || [];
  const latestAdvisory = cropAdvisories.latest;

  const getActivityIcon = (type) => {
    switch (type) {
      case 'advisory_created':
        return { icon: 'fa-seedling', color: 'text-[#16A34A] bg-[#DCFCE7]' };
      case 'price_viewed':
        return { icon: 'fa-tags', color: 'text-[#F59E0B] bg-[#FEF3C7]' };
      case 'news_opened':
        return { icon: 'fa-newspaper', color: 'text-[#2563EB] bg-[#DBEAFE]' };
      default:
        return { icon: 'fa-leaf', color: 'text-[#166534] bg-[#DCFCE7]' };
    }
  };

  return (
    <div className="view-transition space-y-6">

      {/* 1. Header Welcome Banner */}
      <div className="bg-white rounded-[16px] p-6 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#17231C] tracking-tight">
            Welcome back, <span className="text-[#166534]">{user?.firstName || 'Farmer'}</span> 👋
          </h1>
          <p className="text-[#64748B] text-xs mt-1 font-medium">
            Smart Agriculture Platform Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] bg-[#F8FAFC] px-4 py-2.5 rounded-xl border border-[#E2E8F0] shrink-0">
          <i className="far fa-calendar-alt text-[#166534]"></i>
          <span>{formattedDate}</span>
          <span className="text-[#E2E8F0]">|</span>
          <span className="font-mono text-[#166534]">{formattedTimeStr}</span>
        </div>
      </div>

      {/* Profile Address Notice */}
      {showAddressTip && !user?.address && (
        <div className="p-4 bg-[#F0FDF4] border border-[#22C55E]/30 rounded-[16px] flex items-center justify-between gap-3 text-xs text-[#17231C] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#166534] text-white flex items-center justify-center shrink-0 shadow-xs">
              <i className="fas fa-lightbulb text-sm"></i>
            </div>
            <div>
              <span className="font-bold text-[#166534] mr-1">Profile Tip:</span>
              <span>Add your location in <button type="button" onClick={() => navigate('/settings')} className="font-bold text-[#166534] underline hover:text-[#14532D] cursor-pointer">Profile Settings</button> for localized weather and market forecasts.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddressTip(false)}
            className="text-[#64748B] hover:text-[#17231C] p-1 shrink-0 cursor-pointer"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>
      )}

      {/* 2. Key Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="agri-card agri-card-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F0FDF4] text-[#166534] flex items-center justify-center text-xl shrink-0">
            <i className="fas fa-store"></i>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Active Markets</p>
            <p className="text-xl font-extrabold text-[#17231C] mt-0.5">
              {cropPrices.availableCrops || 14} <span className="text-xs font-semibold text-[#64748B]">Crops</span>
            </p>
          </div>
        </div>

        <div className="agri-card agri-card-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] text-[#F59E0B] flex items-center justify-center text-xl shrink-0">
            <i className="fas fa-tag"></i>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Live Price Index</p>
            <p className="text-xl font-extrabold text-[#F59E0B] mt-0.5">
              ₹42/kg <span className="text-xs font-bold text-[#16A34A]">+8.4% ↑</span>
            </p>
          </div>
        </div>

        <div className="agri-card agri-card-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#DCFCE7] text-[#10B981] flex items-center justify-center text-xl shrink-0">
            <i className="fas fa-seedling"></i>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Crop Health</p>
            <p className="text-xl font-extrabold text-[#16A34A] mt-0.5">🌱 Healthy</p>
          </div>
        </div>

        <div className="agri-card agri-card-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center text-xl shrink-0">
            <i className="fas fa-cloud-sun"></i>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Weather Status</p>
            <p className="text-xl font-extrabold text-[#17231C] mt-0.5">{weather.temperature}°C {weather.status}</p>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">

          {/* Weather Card */}
          <div className="bg-[#166534] text-white rounded-[16px] p-6 shadow-md border border-[#166534] relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <div className="flex items-center gap-2">
                <i className="fas fa-location-dot text-[#22C55E]"></i>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#A7F3D0]">
                  Location Weather Forecast
                </span>
              </div>

              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                disabled={weatherLoading}
                className="bg-white/15 text-white text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer border border-white/20"
              >
                {availableCities.map((city) => (
                  <option key={city.id || city.name} value={city.name} className="text-[#17231C] bg-white font-semibold">
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-extrabold tracking-tight">{weather.temperature}°C</span>
                  <span className="text-lg font-bold text-[#22C55E] capitalize">{weather.status}</span>
                </div>
                <p className="text-xs text-[#A7F3D0] mt-1">Location: <strong className="text-white">{weather.city}</strong></p>
              </div>
              <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-4xl text-[#22C55E]">
                <i className={`fas ${weather.icon || 'fa-cloud-sun'}`}></i>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/15 text-xs text-center font-semibold">
              <div className="bg-white/10 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase text-[#A7F3D0] block">Humidity</span>
                <span className="text-sm font-bold text-white mt-0.5 block">{weather.humidity}%</span>
              </div>
              <div className="bg-white/10 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase text-[#A7F3D0] block">Wind Speed</span>
                <span className="text-sm font-bold text-white mt-0.5 block">{weather.windSpeed} km/h</span>
              </div>
              <div className="bg-white/10 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase text-[#A7F3D0] block">Rain Risk</span>
                <span className="text-sm font-bold text-[#22C55E] mt-0.5 block">{weather.rainProbability}%</span>
              </div>
            </div>
          </div>

          {/* AI Advisory Summary */}
          <div className="agri-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#166534] flex items-center justify-center text-sm font-bold">
                  <i className="fas fa-seedling"></i>
                </div>
                <h3 className="card-heading">Crop Advisory Summary</h3>
              </div>
              <button
                onClick={() => navigate('/advisory')}
                className="text-xs font-bold text-[#166534] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All Advisories</span>
                <i className="fas fa-arrow-right text-[10px]"></i>
              </button>
            </div>

            {latestAdvisory ? (
              <div
                onClick={() => navigate('/advisory')}
                className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#22C55E] transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-[#17231C]">{latestAdvisory.cropType}</span>
                    <span className="badge-success">{latestAdvisory.growthStage}</span>
                  </div>
                  <span className="text-[11px] text-[#64748B] font-semibold">{formatUserDateTime(latestAdvisory.createdAt)}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#64748B] block font-semibold">State/District</span>
                    <span className="font-bold text-[#17231C] truncate block">
                      {[latestAdvisory.district, latestAdvisory.state].filter(Boolean).join(', ') || 'Tamil Nadu'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] block font-semibold">Soil Type</span>
                    <span className="font-bold text-[#17231C] block">{latestAdvisory.soilType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] block font-semibold">Pest Risk</span>
                    <span className={`font-extrabold block ${latestAdvisory.diseaseRisk === 'High' ? 'text-[#DC2626]' : latestAdvisory.diseaseRisk === 'Medium' ? 'text-[#D97706]' : 'text-[#16A34A]'}`}>
                      {latestAdvisory.diseaseRisk || 'Low Risk'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] block font-semibold">Yield Forecast</span>
                    <span className="font-bold text-[#17231C] block truncate">{latestAdvisory.yieldPrediction || 'Optimal'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0] space-y-2">
                <p className="text-xs font-bold text-[#17231C]">No Advisories Generated Yet</p>
                <p className="text-[11px] text-[#64748B]">Get smart advice for irrigation, fertilizers, and pest risks.</p>
                <button onClick={() => navigate('/advisory')} className="btn-primary text-xs mt-2">
                  <i className="fas fa-plus"></i> Generate Advisory
                </button>
              </div>
            )}
          </div>

          {/* Live Crop Prices Cards */}
          <div className="agri-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] text-[#F59E0B] flex items-center justify-center text-sm font-bold">
                  <i className="fas fa-tags"></i>
                </div>
                <h3 className="card-heading">Live Mandi Crop Prices</h3>
              </div>
              <button
                onClick={() => navigate('/prices')}
                className="text-xs font-bold text-[#166534] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Market Feed</span>
                <i className="fas fa-arrow-right text-[10px]"></i>
              </button>
            </div>

            {cropPrices.latest && cropPrices.latest.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cropPrices.latest.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate('/prices')}
                    className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#22C55E] transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="font-extrabold text-xs text-[#17231C]">{item.name}</h4>
                      <p className="text-[10px] text-[#64748B] mt-0.5">{item.market || 'APMC Mandi'}, {item.district}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm text-[#F59E0B] block">₹{item.price}</span>
                      <span className="text-[10px] font-bold text-[#16A34A]">/{item.unit || 'Qtl'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0]">
                <p className="text-xs font-bold text-[#17231C]">No Mandi Crop Prices Available</p>
                <button onClick={() => navigate('/prices')} className="btn-secondary text-xs mt-2">
                  Refresh Price Directory
                </button>
              </div>
            )}
          </div>

          {/* Mandi Crop Price Visualization Graph (Moved directly below Live Mandi Crop Prices) */}
          <PriceTrendChart data={cropPrices.latest && cropPrices.latest.length > 0 ? cropPrices.latest.map(p => Number(p.price || 0)) : [42]} />

        </div>

        {/* Right 1 Column */}
        <div className="space-y-6">

          {/* Quick Shortcuts */}
          <div className="agri-card p-6 space-y-3">
            <h3 className="card-heading border-b border-[#E2E8F0] pb-3">Quick Navigation</h3>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => navigate('/advisory')}
                className="p-3 bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#166534] rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center gap-1.5 cursor-pointer border border-[#22C55E]/20"
              >
                <i className="fas fa-seedling text-base"></i>
                <span className="truncate w-full text-[11px]">Advisory</span>
              </button>

              <button
                onClick={() => navigate('/prices')}
                className="p-3 bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#B45309] rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center gap-1.5 cursor-pointer border border-[#F59E0B]/30"
              >
                <i className="fas fa-tags text-base"></i>
                <span className="truncate w-full text-[11px]">Prices</span>
              </button>

              <button
                onClick={() => navigate('/news')}
                className="p-3 bg-[#DBEAFE] hover:bg-[#BFDBFE] text-[#2563EB] rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center gap-1.5 cursor-pointer border border-[#2563EB]/20"
              >
                <i className="fas fa-newspaper text-base"></i>
                <span className="truncate w-full text-[11px]">News</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="agri-card p-6 space-y-4">
            <h3 className="card-heading border-b border-[#E2E8F0] pb-3">Recent Activity</h3>
            {activities && activities.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto divide-y divide-[#E2E8F0]">
                {activities.map((act, idx) => {
                  const visual = getActivityIcon(act.type);
                  return (
                    <div key={act._id || idx} className="pt-2.5 first:pt-0 flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-lg ${visual.color} flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold`}>
                        <i className={`fas ${visual.icon}`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-[#17231C] truncate">{act.title}</p>
                          <span className="text-[10px] text-[#64748B] shrink-0">{formatUserDateTime(act.createdAt)}</span>
                        </div>
                        {act.description && (
                          <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-1">{act.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#64748B] text-center py-4">No recent activity recorded.</p>
            )}
          </div>

          {/* Farmer News Widget */}
          <div className="agri-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="card-heading">Farmer News & Schemes</h3>
              <Link to="/news" className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer">
                <span>View All →</span>
              </Link>
            </div>

            {farmerNews.latest && farmerNews.latest.length > 0 ? (
              <div className="space-y-2.5">
                {farmerNews.latest.slice(0, 4).map((item) => {
                  const pubDate = (item.publishedAt || item.date)
                    ? new Date(item.publishedAt || item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'Recent';
                  return (
                    <div
                      key={item.id || item._id}
                      onClick={() => navigate('/news/detail', { state: { article: item } })}
                      className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#2563EB] transition-all cursor-pointer space-y-1 group"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="badge-info text-[9px]">{item.tag || 'Agriculture'}</span>
                        <span className="text-[#64748B] font-medium">{item.source || 'Agri News'} • {pubDate}</span>
                      </div>
                      <h4 className="font-bold text-xs text-[#17231C] line-clamp-2 group-hover:text-[#2563EB] transition-colors">{item.title}</h4>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#64748B] text-center py-4">No news articles currently.</p>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;
