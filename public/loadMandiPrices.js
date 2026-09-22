// Live Mandi Prices - Frontend JavaScript

// Load filter options (states, commodities)
async function loadFilterOptions() {
    try {
        // Load states
        const statesResponse = await fetch('/api/mandi/states');
        if (!statesResponse.ok) {
            throw new Error(`HTTP error! status: ${statesResponse.status}`);
        }
        const statesData = await statesResponse.json();

        const stateSelect = document.getElementById('filter-state');
        if (stateSelect) {
            if (statesData.success && statesData.states && statesData.states.length > 0) {
                stateSelect.innerHTML = '<option value="">Select State</option>' +
                    statesData.states.map(s => `<option value="${s}">${s}</option>`).join('');

                // Add change event listener to state dropdown
                stateSelect.addEventListener('change', function() {
                    const selectedState = this.value;
                    if (selectedState) {
                        fetchDistricts(selectedState);
                    } else {
                        // Reset district dropdown if no state selected
                        const districtSelect = document.getElementById('filter-district');
                        if (districtSelect) {
                            districtSelect.innerHTML = '<option value="">Select State First</option>';
                            districtSelect.disabled = true;
                        }
                    }
                });
            } else {
                stateSelect.innerHTML = '<option value="">No states available</option>';
                console.error('No states returned from API');
            }
        }

        // Load commodities
        const commoditiesResponse = await fetch('/api/mandi/commodities');
        if (!commoditiesResponse.ok) {
            throw new Error(`HTTP error! status: ${commoditiesResponse.status}`);
        }
        const commoditiesData = await commoditiesResponse.json();

        const commoditySelect = document.getElementById('filter-commodity');
        if (commoditySelect) {
            if (commoditiesData.success && commoditiesData.commodities) {
                commoditySelect.innerHTML = '<option value="">All Commodities</option>' +
                    commoditiesData.commodities.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            } else {
                commoditySelect.innerHTML = '<option value="">All Commodities</option>';
            }
        }
    } catch (error) {
        console.error('Error loading filter options:', error);
        alert('Failed to load filter options. Please refresh the page or check if the server is running.');
    }
}

// Fetch districts for a given state
async function fetchDistricts(state) {
    const districtSelect = document.getElementById('filter-district');
    if (!districtSelect) return;

    // Disable dropdown while loading
    districtSelect.disabled = true;
    districtSelect.innerHTML = '<option value="">Loading districts...</option>';

    try {
        const response = await fetch(`/api/mandi/districts?state=${encodeURIComponent(state)}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.districts && data.districts.length > 0) {
            // Clear and populate dropdown
            districtSelect.innerHTML = '<option value="">All Districts</option>' +
                data.districts.map(d => `<option value="${d}">${d}</option>`).join('');
            districtSelect.disabled = false;
        } else {
            // No districts found
            districtSelect.innerHTML = '<option value="">No districts available</option>';
            districtSelect.disabled = true;
            console.warn(`No districts found for state: ${state}`);
        }
    } catch (error) {
        console.error('Error loading districts:', error);
        districtSelect.innerHTML = '<option value="">Error loading districts</option>';
        districtSelect.disabled = true;
        alert(`Failed to load districts for ${state}. Please try again.`);
    }
}

// Handle state change - wrapper function for backward compatibility
function handlePricesStateChange() {
    const stateSelect = document.getElementById('filter-state');
    const state = stateSelect?.value;

    if (!state) {
        const districtSelect = document.getElementById('filter-district');
        if (districtSelect) {
            districtSelect.innerHTML = '<option value="">Select State First</option>';
            districtSelect.disabled = true;
        }
        return;
    }

    fetchDistricts(state);
}


// Load mandi prices
async function loadMandiPrices() {
    const state = document.getElementById('filter-state')?.value;
    const district = document.getElementById('filter-district')?.value;
    const commodity = document.getElementById('filter-commodity')?.value;

    const tbody = document.getElementById('prices-table-body');
    if (!tbody) return;

    // Show loading
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="px-4 sm:px-6 py-12 text-center">
                <div class="flex flex-col items-center">
                    <i class="fas fa-spinner fa-spin text-3xl text-brand-500 mb-3"></i>
                    <p class="text-slate-500">Loading market prices...</p>
                </div>
            </td>
        </tr>
    `;

    try {
        let url = '/api/mandi/prices?';
        const params = [];
        if (state) params.push(`state=${encodeURIComponent(state)}`);
        if (district) params.push(`district=${encodeURIComponent(district)}`);
        if (commodity) params.push(`commodity=${encodeURIComponent(commodity)}`);
        url += params.join('&');

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
            tbody.innerHTML = data.data.map(item => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-4 sm:px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-leaf text-brand-600"></i>
                            </div>
                            <span class="font-semibold text-slate-800">${item.commodity || 'N/A'}</span>
                        </div>
                    </td>
                    <td class="px-4 sm:px-6 py-4 text-slate-600">${item.market || 'N/A'}</td>
                    <td class="px-4 sm:px-6 py-4 text-slate-600 text-right">₹${(item.minPrice || 0).toLocaleString('en-IN')}</td>
                    <td class="px-4 sm:px-6 py-4 text-slate-600 text-right">₹${(item.maxPrice || 0).toLocaleString('en-IN')}</td>
                    <td class="px-4 sm:px-6 py-4 text-right">
                        <span class="font-bold text-brand-600">₹${(item.modalPrice || 0).toLocaleString('en-IN')}</span>
                        <span class="ml-2 text-xs font-semibold ${(item.trend || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                            ${(item.trend || 0) >= 0 ? '+' : ''}${item.trend || 0}%
                        </span>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-4 sm:px-6 py-12 text-center">
                        <div class="flex flex-col items-center">
                            <i class="fas fa-info-circle text-3xl text-slate-300 mb-3"></i>
                            <p class="text-slate-500">No prices available for selected filters</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading mandi prices:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 sm:px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-exclamation-triangle text-3xl text-red-300 mb-3"></i>
                        <p class="text-red-500">Error loading prices. Please check if the server is running and try again.</p>
                    </div>
                </td>
            </tr>
        `;
        alert('Failed to load market prices. Please check your connection and try again.');
    }
}


// Initialize prices page
function initPrices() {
    console.log('Initializing prices page...');
    loadFilterOptions().then(() => {
        console.log('Filter options loaded');
        loadMandiPrices();
    }).catch(error => {
        console.error('Failed to initialize prices page:', error);
    });
}

// Auto-init if on prices page
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('view-prices')) {
        console.log('Prices view detected, initializing...');
        initPrices();
    }
});
