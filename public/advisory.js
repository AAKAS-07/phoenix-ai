// AI Crop Advisory Frontend Functions
console.log("JS Loaded Successfully");

// Global variables to store fetched data

let cachedAdvisoryStates = [];
let cachedAdvisoryDistricts = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadAdvisoryFilterOptions();
    setupAdvisoryEventListeners();
});

// Setup event listeners
function setupAdvisoryEventListeners() {
    const cropSelect = document.getElementById('advisory-crop');
    const stateSelect = document.getElementById('advisory-state');

    if (cropSelect) {
        cropSelect.addEventListener('change', updateGrowthStages);
    }

    if (stateSelect) {
        stateSelect.addEventListener('change', function() {
            const selectedState = this.value;
            if (selectedState) {
                fetchAdvisoryDistricts(selectedState);
            } else {
                // Reset district dropdown
                const districtSelect = document.getElementById('advisory-district');
                if (districtSelect) {
                    districtSelect.innerHTML = '<option value="">Select State First</option>';
                    districtSelect.disabled = true;
                }
            }
        });
    }
}


// Load states from API
async function loadAdvisoryFilterOptions() {
    const stateSelect = document.getElementById('advisory-state');
    if (!stateSelect) return;

    try {
        const response = await fetch('/api/mandi/states');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.states && data.states.length > 0) {
            cachedAdvisoryStates = data.states;
            stateSelect.innerHTML = '<option value="">Select State</option>';
            data.states.forEach(state => {
                const option = document.createElement('option');
                option.value = state;
                option.textContent = state;
                stateSelect.appendChild(option);
            });
        } else {
            stateSelect.innerHTML = '<option value="">No states available</option>';
            console.error('No states returned from API');
        }
    } catch (error) {
        console.error('Error loading states for advisory:', error);
        stateSelect.innerHTML = '<option value="">Error loading states</option>';
        alert('Failed to load states. Please check if the server is running.');
    }
}


// Fetch districts for advisory form
async function fetchAdvisoryDistricts(state) {
    const districtSelect = document.getElementById('advisory-district');
    if (!districtSelect) return;

    // Disable and show loading
    districtSelect.disabled = true;
    districtSelect.innerHTML = '<option value="">Loading districts...</option>';
    cachedAdvisoryDistricts = [];

    if (!state) {
        districtSelect.innerHTML = '<option value="">Select State First</option>';
        return;
    }

    try {
        const response = await fetch(`/api/mandi/districts?state=${encodeURIComponent(state)}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.districts && data.districts.length > 0) {
            cachedAdvisoryDistricts = data.districts;

            // Clear and populate with "All Districts" as default
            districtSelect.innerHTML = '<option value="">All Districts</option>';

            data.districts.forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });

            districtSelect.disabled = false;
        } else {
            districtSelect.innerHTML = '<option value="">No districts available</option>';
            console.warn(`No districts found for state: ${state}`);
        }
    } catch (error) {
        console.error('Error loading districts:', error);
        districtSelect.innerHTML = '<option value="">Error loading districts</option>';
        districtSelect.disabled = true;
        alert(`Failed to load districts for ${state}. Please try again.`);
    }
}

// Handle State dropdown change - wrapper for backward compatibility
async function handleAdvisoryStateChange(state) {
    await fetchAdvisoryDistricts(state);
}


// Generate Advisory - called when form is submitted
async function generateAdvisory(e) {
    e.preventDefault();
    console.log("Generate Advisory function triggered!");

    const crop = document.getElementById('advisory-crop')?.value;
    const growthStage = document.getElementById('advisory-stage')?.value;
    const state = document.getElementById('advisory-state')?.value || '';
    const district = document.getElementById('advisory-district')?.value || '';
    const soilPH = document.getElementById('advisory-ph')?.value || '7.0';
    const soilType = document.getElementById('advisory-soil')?.value || 'loam';

    if (!crop || !growthStage) {
        showToast('Please select crop and growth stage');
        return;
    }

    if (!state) {
        showToast('Please select a state');
        return;
    }


    // Show loading
    document.getElementById('advisory-form').classList.add('hidden');
    document.getElementById('advisory-loading').classList.remove('hidden');
    document.getElementById('advisory-results').classList.add('hidden');

    try {
        const response = await fetch('/api/advisory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                crop,
                growthStage,
                state,
                district,
                soilPH,
                soilType
            })
        });

        const result = await response.json();

        if (result.success) {
            displayAdvisoryResults(result.data);
            // Save to database
            saveAdvisoryToDatabase(result.data);
        } else {
            showToast(result.message || 'Failed to generate advisory');
            document.getElementById('advisory-loading').classList.add('hidden');
            document.getElementById('advisory-form').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Advisory error:', error);
        showToast('Network error. Please try again.');
        document.getElementById('advisory-loading').classList.add('hidden');
        document.getElementById('advisory-form').classList.remove('hidden');
    }
}

// Save advisory result to database
async function saveAdvisoryToDatabase(data) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('No token found, skipping save to database');
            return;
        }

        const saveData = {
            cropType: data.input?.crop || document.getElementById('advisory-crop').value,
            growthStage: data.input?.growthStage || document.getElementById('advisory-stage').value,
            state: data.input?.location?.state || document.getElementById('advisory-state').value,
            district: data.input?.location?.district || document.getElementById('advisory-district').value || '',
            soilPH: parseFloat(data.input?.soil?.ph) || 7.0,
            soilType: data.input?.soil?.type || 'loam',
            weather: {
                temperature: data.weather?.temperature || null,
                humidity: data.weather?.humidity || null,
                description: data.weather?.description || '',
                rainfall: data.weather?.rainfall || null
            },
            irrigation: data.irrigationAdvice,
            diseaseRisk: data.diseaseRisk,
            fertilizer: data.fertilizerRecommendation,
            yieldPrediction: data.yieldPrediction,
            marketSuggestion: data.marketSuggestion
        };

        const response = await fetch('/api/advisory/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(saveData)
        });

        const result = await response.json();

        if (result.success) {
            console.log('Advisory saved to database:', result.message);
            showToast('Advisory saved to history!');
        } else {
            console.warn('Failed to save advisory:', result.message);
        }
    } catch (error) {
        console.error('Error saving advisory to database:', error);
    }
}

// Display the advisory results
function displayAdvisoryResults(data) {
    // Hide loading, show results
    document.getElementById('advisory-loading').classList.add('hidden');
    document.getElementById('advisory-results').classList.remove('hidden');

    // Show back button
    const backBtn = document.getElementById('advisory-back-btn');
    if (backBtn) {
        backBtn.classList.remove('hidden');
    }

    // Weather info
    if (document.getElementById('result-location')) {
        document.getElementById('result-location').textContent = `${data.input?.location?.state || 'N/A'}${data.input?.location?.district ? ', ' + data.input.location.district : ''}`;
    }
    if (document.getElementById('result-temp')) {
        document.getElementById('result-temp').textContent = `${data.weather?.temperature || 'N/A'}°C`;
    }
    if (document.getElementById('result-humidity')) {
        document.getElementById('result-humidity').textContent = `Humidity: ${data.weather?.humidity || 'N/A'}%`;
    }

    // Irrigation
    if (document.getElementById('irrigation-urgency')) {
        document.getElementById('irrigation-urgency').textContent = data.irrigationUrgency || 'Normal';
    }
    if (document.getElementById('irrigation-advice')) {
        document.getElementById('irrigation-advice').textContent = data.irrigationAdvice || 'Maintain regular irrigation schedule.';
    }

    // Disease Risk
    const diseaseRiskEl = document.getElementById('disease-risk');
    if (diseaseRiskEl) {
        diseaseRiskEl.textContent = data.diseaseRisk || 'Low';
        diseaseRiskEl.className = `text-xs font-bold ${data.diseaseRisk === 'High' ? 'text-red-600' : data.diseaseRisk === 'Medium' ? 'text-amber-600' : 'text-green-600'}`;
    }
    if (document.getElementById('disease-advice')) {
        document.getElementById('disease-advice').textContent = data.diseaseRecommendation || 'No specific concerns.';
    }

    // Fertilizer
    if (document.getElementById('npk-values')) {
        document.getElementById('npk-values').textContent = data.npkValues || 'N:100 P:50 K:40';
    }
    if (document.getElementById('fertilizer-advice')) {
        document.getElementById('fertilizer-advice').textContent = data.fertilizerRecommendation || 'Apply balanced fertilizer.';
    }

    // Yield Prediction
    if (document.getElementById('yield-prediction')) {
        document.getElementById('yield-prediction').textContent = data.yieldPrediction || 'Good';
    }
    if (document.getElementById('yield-percentage')) {
        document.getElementById('yield-percentage').textContent = data.yieldPercentage || '75% yield expected';
    }

    // Market Suggestion
    if (document.getElementById('market-trend')) {
        document.getElementById('market-trend').textContent = data.marketTrend || 'Stable';
    }
    if (document.getElementById('market-advice')) {
        document.getElementById('market-advice').textContent = data.marketSuggestion || 'Current market prices are stable.';
    }

    // Soil Status
    if (document.getElementById('soil-status')) {
        document.getElementById('soil-status').textContent = data.soilStatus || 'Optimal';
    }
    if (document.getElementById('soil-info')) {
        document.getElementById('soil-info').textContent = `pH: ${data.input?.soil?.ph || 'N/A'} - ${data.input?.soil?.type || 'loam'} soil`;
    }

    // Disease Warning
    const diseasesWarning = document.getElementById('diseases-warning');
    if (diseasesWarning) {
        if (data.diseaseRisk === 'High' && data.activeDiseases && data.activeDiseases.length > 0) {
            diseasesWarning.classList.remove('hidden');
            const diseasesList = document.getElementById('diseases-list');
            if (diseasesList) {
                diseasesList.innerHTML = data.activeDiseases.map(d =>
                    `<p class="text-sm text-red-700">• ${d.name} - ${d.probability} probability</p>`
                ).join('');
            }
            if (document.getElementById('disease-recommendation')) {
                document.getElementById('disease-recommendation').textContent = data.diseaseRecommendation;
            }
        } else {
            diseasesWarning.classList.add('hidden');
        }
    }
}

// Update growth stage options based on selected crop
function updateGrowthStages() {
    const cropSelect = document.getElementById('advisory-crop');
    const stageSelect = document.getElementById('advisory-stage');
    const crop = cropSelect.value;

    const growthStages = {
        wheat: ['sowing', 'vegetative', 'flowering', 'grain_fill', 'harvest'],
        rice: ['sowing', 'transplanting', 'tillering', 'flowering', 'grain_fill', 'harvest'],
        cotton: ['sowing', 'vegetative', 'flowering', 'boll_development', 'harvest'],
        sugarcane: ['planting', 'tillering', 'grand_growth', 'maturity', 'harvest'],
        maize: ['sowing', 'emergence', 'vegetative', 'tasseling', 'grain_fill', 'harvest'],
        soybean: ['sowing', 'vegetative', 'flowering', 'pod_development', 'harvest'],
        potato: ['planting', 'sprout', 'vegetative', 'tuber_initiation', 'tuber_bulking', 'harvest'],
        tomato: ['seedling', 'vegetative', 'flowering', 'fruiting', 'harvest']
    };

    const stages = growthStages[crop] || ['sowing', 'vegetative', 'flowering', 'harvest'];

    stageSelect.innerHTML = '<option value="">Select Growth Stage</option>';
    stages.forEach(stage => {
        const option = document.createElement('option');
        option.value = stage;
        option.textContent = stage.charAt(0).toUpperCase() + stage.slice(1).replace('_', ' ');
        stageSelect.appendChild(option);
    });
}

// Legacy function for backward compatibility
function handleStateChange(state) {
    handleAdvisoryStateChange(state);
}
