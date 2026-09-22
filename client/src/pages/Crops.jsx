import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { TableSkeleton } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { ALL_INDIAN_STATES, getDistrictsForState } from '../data/indianStatesDistricts';

const Crops = () => {
  const { showToast } = useAuth();

  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('');

  const [statesList, setStatesList] = useState(ALL_INDIAN_STATES);
  const [districtsList, setDistrictsList] = useState([]);
  const [commoditiesList, setCommoditiesList] = useState([]);

  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchFilterOptions();
    fetchPrices();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const [statesRes, commoditiesRes] = await Promise.all([
        api.get('/mandi/states'),
        api.get('/mandi/commodities')
      ]);

      let apiStates = [];
      if (statesRes.data && statesRes.data.success && Array.isArray(statesRes.data.states)) {
        apiStates = statesRes.data.states;
      }

      const combinedStates = Array.from(
        new Set([...ALL_INDIAN_STATES, ...apiStates])
      ).sort();

      setStatesList(combinedStates);

      if (commoditiesRes.data && commoditiesRes.data.success && Array.isArray(commoditiesRes.data.commodities)) {
        setCommoditiesList(commoditiesRes.data.commodities);
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
      setStatesList(ALL_INDIAN_STATES);
    }
  };

  const handleStateChange = async (e) => {
    const stateVal = e.target.value;
    setSelectedState(stateVal);
    setSelectedDistrict('');
    setSelectedMarket('');

    if (!stateVal) {
      setDistrictsList([]);
      return;
    }

    const localDistricts = getDistrictsForState(stateVal);
    setDistrictsList(localDistricts);

    try {
      const res = await api.get(`/mandi/districts?state=${encodeURIComponent(stateVal)}`);
      if (res.data && res.data.success && Array.isArray(res.data.districts)) {
        const combinedDistricts = Array.from(
          new Set([...localDistricts, ...res.data.districts])
        ).sort();
        setDistrictsList(combinedDistricts);
      }
    } catch (err) {
      console.error('Error fetching districts:', err);
    }
  };

  const matchesNormalized = (recordVal, filterVal) => {
    if (!filterVal || filterVal.trim() === '') return true;
    if (!recordVal) return false;
    const normRecord = String(recordVal).toLowerCase().replace(/[^a-z0-9]/g, '');
    const normFilter = String(filterVal).toLowerCase().replace(/[^a-z0-9]/g, '');
    return normRecord === normFilter || normRecord.includes(normFilter);
  };

  const fetchPrices = async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      let url = '/crops/mandi?save=true';
      if (selectedState) url += `&state=${encodeURIComponent(selectedState)}`;
      if (selectedDistrict) url += `&district=${encodeURIComponent(selectedDistrict)}`;
      if (selectedCommodity) url += `&commodity=${encodeURIComponent(selectedCommodity)}`;

      const res = await api.get(url);
      if (res.data && res.data.data) {
        let rawData = res.data.data;

        if (selectedState || selectedDistrict || selectedMarket || selectedCommodity) {
          rawData = rawData.filter(item => {
            const matchState = matchesNormalized(item.state, selectedState);
            const matchDistrict = matchesNormalized(item.district, selectedDistrict);
            const matchMarket = matchesNormalized(item.market, selectedMarket);
            const matchCommodity = matchesNormalized(item.commodity || item.name, selectedCommodity);
            return matchState && matchDistrict && matchMarket && matchCommodity;
          });
        }

        setPrices(rawData);
      }
    } catch (err) {
      console.error('Error loading mandi prices:', err);
      showToast({
        title: 'Network error',
        message: 'Unable to load live API data. Loading fallback dataset.',
        type: 'warning'
      });
      try {
        const fallbackRes = await api.get('/mandi/prices');
        if (fallbackRes.data && fallbackRes.data.data) {
          let fallbackData = fallbackRes.data.data;
          setPrices(fallbackData);
        }
      } catch (fallbackErr) {}
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPrices();
    showToast({
      title: 'Data refreshed',
      message: 'Mandi price records updated successfully.',
      type: 'success'
    });
  };

  const handleResetFilters = () => {
    setSelectedState('');
    setSelectedDistrict('');
    setSelectedMarket('');
    setSelectedCommodity('');
    setDistrictsList([]);
    fetchPrices();
  };

  const uniqueMarketsList = Array.from(new Set(prices.map(p => p.market).filter(Boolean))).sort();

  return (
    <div className="view-transition max-w-7xl mx-auto space-y-6">

      {/* Hero Header Section */}
      <div className="bg-[#166534] rounded-[16px] p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#22C55E] text-[#17231C] flex items-center justify-center text-2xl font-bold shrink-0">
            <i className="fas fa-tags"></i>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Live Mandi Crop Prices
            </h1>
            <p className="text-[#A7F3D0] text-xs sm:text-sm mt-0.5">
              Compare real-time agricultural crop prices across APMC mandi markets.
            </p>
          </div>
        </div>

        <button
          onClick={fetchPrices}
          disabled={isRefreshing}
          className="btn-secondary text-xs"
        >
          <i className={`fas fa-rotate ${isRefreshing ? 'fa-spin' : ''}`}></i>
          <span>Refresh Prices</span>
        </button>
      </div>

      {/* State -> District -> Market -> Crop Filter Controls */}
      <div className="agri-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <h3 className="card-heading flex items-center gap-2">
            <i className="fas fa-filter text-[#166534]"></i> Mandi Search Filters
          </h3>
          {(selectedState || selectedDistrict || selectedMarket || selectedCommodity) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-[#DC2626] hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">

          {/* State */}
          <div>
            <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1 block">
              State
            </label>
            <div className="input-wrapper">
              <span className="left-icon text-xs"><i className="fas fa-map"></i></span>
              <select
                value={selectedState}
                onChange={handleStateChange}
                className="form-input form-select text-xs"
              >
                <option value="">All States</option>
                {statesList.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          {/* District */}
          <div>
            <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1 block">
              District
            </label>
            <div className="input-wrapper">
              <span className="left-icon text-xs"><i className="fas fa-location-dot"></i></span>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={!selectedState}
                className="form-input form-select text-xs disabled:opacity-50"
              >
                <option value="">{selectedState ? 'All Districts' : 'Select State First'}</option>
                {districtsList.map(dst => (
                  <option key={dst} value={dst}>{dst}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Market */}
          <div>
            <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1 block">
              Market
            </label>
            <div className="input-wrapper">
              <span className="left-icon text-xs"><i className="fas fa-store"></i></span>
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="form-input form-select text-xs"
              >
                <option value="">All Markets</option>
                {uniqueMarketsList.map(mkt => (
                  <option key={mkt} value={mkt}>{mkt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Crop */}
          <div>
            <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1 block">
              Crop
            </label>
            <div className="input-wrapper">
              <span className="left-icon text-xs"><i className="fas fa-wheat-awn"></i></span>
              <select
                value={selectedCommodity}
                onChange={(e) => setSelectedCommodity(e.target.value)}
                className="form-input form-select text-xs"
              >
                <option value="">All Crops</option>
                {commoditiesList.map(c => (
                  <option key={typeof c === 'string' ? c : c.name} value={typeof c === 'string' ? c : c.name}>
                    {typeof c === 'string' ? c : c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-[40px] text-xs font-bold"
            >
              {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magnifying-glass"></i>}
              <span>View Live Price</span>
            </button>
          </div>

        </form>
      </div>

      {/* Prices Table & Directory */}
      <div className="agri-card overflow-hidden">
        <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="card-heading">Live Mandi Directory</h3>
            <p className="text-xs text-[#64748B] mt-0.5">Showing official daily arrival & modal prices</p>
          </div>
          <span className="badge-gold">
            {prices.length} Records Found
          </span>
        </div>

        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : prices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="agri-table">
              <thead>
                <tr>
                  <th>Crop</th>
                  <th>State</th>
                  <th>District</th>
                  <th>Market Area</th>
                  <th>Min Price</th>
                  <th>Max Price</th>
                  <th className="text-right">Modal Price</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((item, idx) => {
                  const minP = Number(item.minPrice || item.price || 0);
                  const maxP = Number(item.maxPrice || item.price || 0);
                  const modalP = Number(item.modalPrice || item.price || 0);

                  return (
                    <tr key={idx}>
                      <td className="font-extrabold text-[#166534] capitalize">
                        📍 {item.commodity || item.name}
                      </td>
                      <td className="font-medium text-[#17231C]">{item.state || 'Tamil Nadu'}</td>
                      <td className="text-[#64748B]">{item.district || 'Erode'}</td>
                      <td className="text-[#64748B]">{item.market || 'Market Area'}</td>
                      <td className="font-mono text-[#64748B]">₹{minP.toLocaleString('en-IN')}</td>
                      <td className="font-mono text-[#64748B]">₹{maxP.toLocaleString('en-IN')}</td>
                      <td className="text-right">
                        <span className="font-mono font-extrabold text-[#F59E0B] text-sm">
                          ₹{modalP.toLocaleString('en-IN')} /{item.unit || 'Qtl'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center space-y-3">
            <i className="fas fa-store-slash text-3xl text-[#64748B]"></i>
            <p className="text-xs font-bold text-[#17231C]">No matching mandi prices found.</p>
            <button onClick={handleResetFilters} className="btn-secondary text-xs">
              Reset Selections
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default Crops;
