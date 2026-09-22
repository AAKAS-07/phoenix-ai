/**
 * AI Crop Advisory Service
 * Provides intelligent recommendations based on crop, weather, soil conditions, and growth stage
 * Uses rule-based expert system with intelligent scoring algorithms
 */

let Crop;
try {
    Crop = require('../models/Crop');
} catch (e) {
    console.log('Crop model not available in advisory service');
}

async function generateOpenAIAdvisory(input) {
    console.log("Using rule-based advisory (OpenAI fallback active)");
    return {
        irrigation: "Use the detailed advisory recommendations provided above.",
        fertilizer: "Follow the NPK recommendations from the rule-based system.",
        pest_control: "Monitor crops regularly and follow disease prevention advice.",
        yield_improvement: "Implement the yield improvement factors listed in the advisory.",
        weather_precaution: "Stay updated with weather conditions and follow local advisories."
    };
}

async function fetchLiveCropPrices(cropName, state = null, district = null) {
    if (!Crop) return null;
    try {
        const filter = {
            commodity: { $regex: cropName, $options: 'i' },
            source: 'data.gov.in'
        };
        if (state) filter.state = { $regex: state, $options: 'i' };
        if (district) filter.district = { $regex: district, $options: 'i' };

        const prices = await Crop.find(filter)
            .sort({ updatedAt: -1 })
            .limit(10)
            .select('state district market commodity variety minPrice maxPrice modalPrice unit arrivalDate');

        return prices.length > 0 ? prices : null;
    } catch (error) {
        console.error('Error fetching live crop prices:', error.message);
        return null;
    }
}

async function getCropPriceStats(cropName) {
    if (!Crop) return null;
    try {
        const pipeline = [
            {
                $match: {
                    commodity: { $regex: cropName, $options: 'i' },
                    source: 'data.gov.in',
                    modalPrice: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: null,
                    avgPrice: { $avg: '$modalPrice' },
                    minPrice: { $min: '$minPrice' },
                    maxPrice: { $max: '$maxPrice' },
                    markets: { $addToSet: '$market' },
                    states: { $addToSet: '$state' },
                    count: { $sum: 1 }
                }
            }
        ];

        const result = await Crop.aggregate(pipeline);
        if (result.length > 0) {
            const r = result[0];
            return {
                averagePrice: Math.round(r.avgPrice),
                minPrice: r.minPrice,
                maxPrice: r.maxPrice,
                marketCount: r.markets.length,
                stateCount: r.states.length,
                totalListings: r.count,
                markets: r.markets.slice(0, 5),
                states: r.states.slice(0, 5)
            };
        }
        return null;
    } catch (error) {
        console.error('Error getting crop price stats:', error.message);
        return null;
    }
}

const cropDatabase = {
    wheat: {
        name: 'Wheat',
        optimalTemp: { min: 15, max: 25 },
        optimalHumidity: { min: 40, max: 70 },
        waterNeed: 'high',
        npkRatio: { n: 120, p: 60, k: 40 },
        growthStages: ['sowing', 'vegetative', 'flowering', 'grain_fill', 'harvest'],
        diseases: ['rust', 'powdery_mildew', 'leaf_spot'],
        marketSeasons: ['nov', 'dec', 'jan', 'feb'],
        baseYield: 45,
        criticalTempHigh: 30,
        criticalTempLow: 10
    },
    rice: {
        name: 'Rice (Basmati)',
        optimalTemp: { min: 20, max: 35 },
        optimalHumidity: { min: 60, max: 80 },
        waterNeed: 'very_high',
        npkRatio: { n: 100, p: 50, k: 50 },
        growthStages: ['sowing', 'transplanting', 'tillering', 'flowering', 'grain_fill', 'harvest'],
        diseases: ['blast', 'bacterial_leaf_blight', 'brown_spot'],
        marketSeasons: ['oct', 'nov', 'dec'],
        baseYield: 35,
        criticalTempHigh: 38,
        criticalTempLow: 15
    },
    cotton: {
        name: 'Cotton',
        optimalTemp: { min: 20, max: 35 },
        optimalHumidity: { min: 40, max: 70 },
        waterNeed: 'medium',
        npkRatio: { n: 100, p: 50, k: 50 },
        growthStages: ['sowing', 'vegetative', 'flowering', 'boll_development', 'harvest'],
        diseases: ['cotton_wilt', 'boll_rot', 'armyworm'],
        marketSeasons: ['oct', 'nov', 'dec'],
        baseYield: 25,
        criticalTempHigh: 40,
        criticalTempLow: 15
    },
    sugarcane: {
        name: 'Sugarcane',
        optimalTemp: { min: 20, max: 35 },
        optimalHumidity: { min: 50, max: 80 },
        waterNeed: 'high',
        npkRatio: { n: 150, p: 60, k: 80 },
        growthStages: ['planting', 'tillering', 'grand_growth', 'maturity', 'harvest'],
        diseases: ['red_rot', 'wilt', 'smut'],
        marketSeasons: ['nov', 'dec', 'jan', 'feb'],
        baseYield: 750,
        criticalTempHigh: 40,
        criticalTempLow: 15
    },
    maize: {
        name: 'Maize',
        optimalTemp: { min: 18, max: 30 },
        optimalHumidity: { min: 40, max: 70 },
        waterNeed: 'medium',
        npkRatio: { n: 120, p: 60, k: 40 },
        growthStages: ['sowing', 'emergence', 'vegetative', 'tasseling', 'grain_fill', 'harvest'],
        diseases: ['stalk_rot', 'leaf_blight', 'rust'],
        marketSeasons: ['mar', 'apr', 'may'],
        baseYield: 50,
        criticalTempHigh: 35,
        criticalTempLow: 12
    },
    soybean: {
        name: 'Soybean',
        optimalTemp: { min: 15, max: 30 },
        optimalHumidity: { min: 50, max: 70 },
        waterNeed: 'medium',
        npkRatio: { n: 30, p: 60, k: 40 },
        growthStages: ['sowing', 'vegetative', 'flowering', 'pod_development', 'harvest'],
        diseases: ['rust', 'stem_fly', 'yellow_mosaic'],
        marketSeasons: ['oct', 'nov'],
        baseYield: 25,
        criticalTempHigh: 35,
        criticalTempLow: 10
    },
    potato: {
        name: 'Potato',
        optimalTemp: { min: 15, max: 25 },
        optimalHumidity: { min: 50, max: 70 },
        waterNeed: 'medium',
        npkRatio: { n: 120, p: 80, k: 100 },
        growthStages: ['planting', 'sprout', 'vegetative', 'tuber_initiation', 'tuber_bulking', 'harvest'],
        diseases: ['late_blight', 'early_blight', 'black_scurf'],
        marketSeasons: ['jan', 'feb', 'mar', 'nov', 'dec'],
        baseYield: 200,
        criticalTempHigh: 30,
        criticalTempLow: 8
    },
    tomato: {
        name: 'Tomato',
        optimalTemp: { min: 18, max: 30 },
        optimalHumidity: { min: 40, max: 60 },
        waterNeed: 'medium',
        npkRatio: { n: 100, p: 60, k: 80 },
        growthStages: ['seedling', 'vegetative', 'flowering', 'fruiting', 'harvest'],
        diseases: ['blight', 'leaf_curl', 'bacterial_wilt'],
        marketSeasons: ['oct', 'nov', 'dec', 'jan'],
        baseYield: 150,
        criticalTempHigh: 35,
        criticalTempLow: 12
    }
};

const soilDatabase = {
    clay: {
        name: 'Clay',
        waterRetention: 'high',
        drainage: 'poor',
        phRange: { min: 6.0, max: 8.0 },
        nutrients: 'high'
    },
    sandy: {
        name: 'Sandy',
        waterRetention: 'low',
        drainage: 'excellent',
        phRange: { min: 5.5, max: 7.0 },
        nutrients: 'low'
    },
    loam: {
        name: 'Loam',
        waterRetention: 'moderate',
        drainage: 'good',
        phRange: { min: 6.0, max: 7.5 },
        nutrients: 'moderate'
    },
    silt: {
        name: 'Silt',
        waterRetention: 'high',
        drainage: 'moderate',
        phRange: { min: 6.0, max: 8.0 },
        nutrients: 'moderate'
    },
    black_cotton: {
        name: 'Black Cotton',
        waterRetention: 'very_high',
        drainage: 'poor',
        phRange: { min: 7.5, max: 8.5 },
        nutrients: 'high'
    },
    red: {
        name: 'Red Soil',
        waterRetention: 'low',
        drainage: 'good',
        phRange: { min: 5.0, max: 6.5 },
        nutrients: 'low'
    }
};

async function fetchWeatherData(state, district) {
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY || '74c5eb3f4cfc3b56b6b7bd342fdd6ac0';
        const city = district || state || 'Coimbatore';

        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},IN&appid=${apiKey}&units=metric`
        );

        if (!response.ok) {
            throw new Error('Weather API unavailable');
        }

        const data = await response.json();

        return {
            temperature: data.main.temp,
            humidity: data.main.humidity,
            description: data.weather[0].description,
            windSpeed: data.wind.speed,
            rainfall: data.rain ? data.rain['1h'] || 0 : 0,
            feelsLike: data.main.feels_like,
            pressure: data.main.pressure
        };
    } catch (error) {
        return getMockWeatherData(state, district);
    }
}

function getMockWeatherData(state, district) {
    const hash = (state || '').length + (district || '').length;
    const temp = 22 + (hash % 15);
    const humidity = 55 + (hash % 30);

    return {
        temperature: temp,
        humidity: humidity,
        description: humidity > 70 ? 'cloudy' : 'clear sky',
        windSpeed: 5 + (hash % 10),
        rainfall: humidity > 75 ? 5 : 0,
        feelsLike: temp - 2,
        pressure: 1013
    };
}

function calculateIrrigationAdvice(weather, crop, soilType, growthStage) {
    const safeCrop = (crop || 'wheat').toLowerCase();
    const safeSoil = (soilType || 'loam').toLowerCase();
    const safeStage = (growthStage || 'vegetative').toLowerCase();

    const cropInfo = cropDatabase[safeCrop] || cropDatabase.wheat;
    const soilInfo = soilDatabase[safeSoil] || soilDatabase.loam;

    let advice = '';
    let urgency = 'low';

    const soilWaterRetention = soilInfo ? soilInfo.waterRetention : 'moderate';
    const tempDiff = (weather?.temperature || 25) - cropInfo.optimalTemp.min;
    const tempStress = Math.abs(tempDiff) > 10;

    const humidityOptimal = (weather?.humidity || 65) >= cropInfo.optimalHumidity.min &&
                           (weather?.humidity || 65) <= cropInfo.optimalHumidity.max;
    const recentRainfall = (weather?.rainfall || 0) > 0;
    const highWaterStages = ['flowering', 'grain_fill', 'tuber_bulking', 'boll_development', 'grand_growth'];
    const isHighWaterStage = highWaterStages.includes(safeStage);

    if (tempStress && !humidityOptimal && !recentRainfall) {
        urgency = 'high';
        advice = `Critical: High temperature (${(weather?.temperature || 25).toFixed(1)}°C) and low humidity (${weather?.humidity || 65}%) detected. Immediate irrigation required.`;
        if (isHighWaterStage) {
            advice += ' This is a critical growth stage - do not delay irrigation.';
        }
    } else if (!humidityOptimal && !recentRainfall) {
        urgency = 'medium';
        advice = `Recommended: Current humidity (${weather?.humidity || 65}%) is below optimal range. Consider irrigation.`;
    } else if (recentRainfall) {
        urgency = 'low';
        advice = 'No irrigation needed: Recent rainfall has provided sufficient moisture.';
    } else if (soilWaterRetention === 'high' && humidityOptimal) {
        urgency = 'low';
        advice = 'Soil moisture is adequate. Irrigation can be scheduled for tomorrow.';
    } else if (isHighWaterStage && !recentRainfall) {
        urgency = 'medium';
        advice = `Recommended: ${cropInfo.name} is in ${safeStage} stage which requires careful water management.`;
    } else {
        advice = 'Soil moisture levels are adequate. Maintain regular irrigation schedule.';
    }

    if ((weather?.temperature || 25) > 30) {
        advice += ' Water early morning or late evening to minimize evaporation.';
    }

    return { advice, urgency };
}

function calculateDiseaseRisk(weather, crop, growthStage) {
    const safeCrop = (crop || 'wheat').toLowerCase();
    const safeStage = (growthStage || 'vegetative').toLowerCase();

    const cropInfo = cropDatabase[safeCrop] || cropDatabase.wheat;

    let riskScore = 0;
    let activeDiseases = [];
    const riskFactors = [];
    const humidity = weather?.humidity || 65;
    const temp = weather?.temperature || 25;
    const rainfall = weather?.rainfall || 0;

    if (humidity > 80) {
        riskScore += 30;
        riskFactors.push('High humidity (>80%) promotes fungal growth');
    } else if (humidity > 70) {
        riskScore += 15;
        riskFactors.push('Moderate humidity may support disease development');
    }

    if (temp >= 20 && temp <= 30) {
        riskScore += 20;
        riskFactors.push('Temperature is in disease-favorable range (20-30°C)');
    }

    if (rainfall > 0) {
        riskScore += 25;
        riskFactors.push('Recent rainfall creates favorable conditions for pathogens');
    }

    const susceptibleStages = ['flowering', 'fruiting', 'grain_fill', 'tuber_bulking'];
    if (susceptibleStages.includes(safeStage)) {
        riskScore += 15;
        riskFactors.push(`${safeStage} stage is highly susceptible to diseases`);
    }

    if (humidity > 75 && temp >= 20 && temp <= 30) {
        if (safeCrop === 'rice') {
            activeDiseases.push({ name: 'Blast', probability: 'High' });
        }
        if (safeCrop === 'wheat') {
            activeDiseases.push({ name: 'Rust', probability: 'High' });
            activeDiseases.push({ name: 'Powdery Mildew', probability: 'Medium' });
        }
        if (safeCrop === 'cotton') {
            activeDiseases.push({ name: 'Boll Rot', probability: 'High' });
        }
        if (safeCrop === 'potato') {
            activeDiseases.push({ name: 'Late Blight', probability: 'High' });
        }
    }

    let riskLevel = 'Low';
    if (riskScore >= 70) riskLevel = 'High';
    else if (riskScore >= 40) riskLevel = 'Medium';
    else riskLevel = 'Low';

    return {
        risk: riskLevel,
        level: riskScore,
        factors: riskFactors,
        diseases: activeDiseases,
        recommendation: riskLevel === 'High'
            ? 'Apply preventive fungicide immediately. Monitor crops daily.'
            : riskLevel === 'Medium'
            ? 'Monitor crops closely. Consider preventive measures.'
            : 'Continue regular monitoring. Conditions are favorable.'
    };
}

function calculateFertilizerRecommendation(crop, growthStage, soilType, soilPH) {
    const safeCrop = (crop || 'wheat').toLowerCase();
    const safeStage = (growthStage || 'vegetative').toLowerCase();
    const safeSoil = (soilType || 'loam').toLowerCase();

    const cropInfo = cropDatabase[safeCrop] || cropDatabase.wheat;
    const soilInfo = soilDatabase[safeSoil] || soilDatabase.loam;
    const baseNPK = cropInfo.npkRatio;

    let stageMultiplier = 1.0;
    let stageAdvice = '';

    switch (safeStage) {
        case 'sowing':
        case 'planting':
        case 'seedling':
            stageMultiplier = 0.3;
            stageAdvice = 'Foundation dose - focus on phosphorus for root development';
            break;
        case 'vegetative':
        case 'tillering':
            stageMultiplier = 0.8;
            stageAdvice = 'High nitrogen requirement for vegetative growth';
            break;
        case 'flowering':
        case 'tasseling':
            stageMultiplier = 1.0;
            stageAdvice = 'Balanced NPK needed for flowering';
            break;
        case 'grain_fill':
        case 'fruiting':
        case 'pod_development':
        case 'tuber_bulking':
            stageMultiplier = 0.7;
            stageAdvice = 'Potassium focus for quality produce';
            break;
        case 'maturity':
        case 'harvest':
            stageMultiplier = 0.2;
            stageAdvice = 'Minimal fertilization - prepare for harvest';
            break;
        default:
            stageMultiplier = 0.5;
    }

    const npk = {
        n: Math.round(baseNPK.n * stageMultiplier),
        p: Math.round(baseNPK.p * stageMultiplier),
        k: Math.round(baseNPK.k * stageMultiplier)
    };

    let soilAdjustment = '';
    if (soilInfo.nutrients === 'low') {
        npk.n = Math.round(npk.n * 1.2);
        npk.p = Math.round(npk.p * 1.3);
        npk.k = Math.round(npk.k * 1.2);
        soilAdjustment = ' Soil is nutrient-deficient - increased doses recommended.';
    } else if (soilInfo.nutrients === 'high') {
        npk.n = Math.round(npk.n * 0.8);
        npk.p = Math.round(npk.p * 0.9);
        soilAdjustment = ' Soil is naturally fertile - reduce doses by 10-20%.';
    }

    let phAdjustment = '';
    const ph = parseFloat(soilPH) || 7.0;
    if (ph < 6.0) {
        phAdjustment = ' Soil is acidic - apply lime to improve nutrient availability.';
    } else if (ph > 8.0) {
        phAdjustment = ' Soil is alkaline - use acid-forming fertilizers.';
    }

    let specialRecommendations = [];
    if (npk.n > 80) {
        specialRecommendations.push('Split nitrogen application: 50% basal, 50% top-dressing');
    }
    if (soilInfo.waterRetention === 'poor') {
        specialRecommendations.push('Apply fertilizers in smaller doses more frequently');
    }
    if (safeStage === 'flowering' || safeStage === 'fruiting') {
        specialRecommendations.push('Consider foliar application of micronutrients');
    }

    return {
        recommendation: `${stageAdvice}.${soilAdjustment}${phAdjustment}`,
        npk: npk,
        applicationMethod: specialRecommendations.join('. '),
        units: 'kg/acre'
    };
}

function calculateYieldPrediction(crop, weather, growthStage, soilType) {
    const safeCrop = (crop || 'wheat').toLowerCase();
    const cropInfo = cropDatabase[safeCrop] || cropDatabase.wheat;
    if (!cropInfo) {
        return { prediction: 'Unknown', confidence: 0, factors: [] };
    }

    let yieldScore = 100;
    const factors = [];

    const tempOptimal = weather.temperature >= cropInfo.optimalTemp.min &&
                        weather.temperature <= cropInfo.optimalTemp.max;
    if (tempOptimal) {
        factors.push('Temperature is optimal for crop growth');
    } else if (weather.temperature < cropInfo.optimalTemp.min - 5) {
        yieldScore -= 20;
        factors.push('Temperature too low - may affect crop development');
    } else if (weather.temperature > cropInfo.optimalTemp.max + 5) {
        yieldScore -= 25;
        factors.push('High temperature stress - may reduce yield');
    } else {
        yieldScore -= 10;
        factors.push('Temperature slightly outside optimal range');
    }

    const humidityOptimal = weather.humidity >= cropInfo.optimalHumidity.min &&
                           weather.humidity <= cropInfo.optimalHumidity.max;
    if (humidityOptimal) {
        factors.push('Humidity levels are favorable');
    } else if (weather.humidity < cropInfo.optimalHumidity.min) {
        yieldScore -= 15;
        factors.push('Low humidity may cause moisture stress');
    } else {
        yieldScore -= 15;
        factors.push('High humidity increases disease risk');
    }

    const harvestStages = ['grain_fill', 'fruiting', 'pod_development', 'tuber_bulking', 'boll_development', 'maturity'];
    if (harvestStages.includes(growthStage.toLowerCase())) {
        factors.push('Crop approaching maturity - conditions look favorable');
    }

    const soilInfo = soilDatabase[soilType.toLowerCase()];
    if (soilInfo) {
        if (soilInfo.waterRetention === 'high') {
            yieldScore += 5;
            factors.push('Good soil water retention capacity');
        }
        if (soilInfo.nutrients === 'high') {
            yieldScore += 5;
            factors.push('Soil has good natural fertility');
        }
    }

    let prediction = 'Average';
    let confidence = 70;

    if (yieldScore >= 90) {
        prediction = 'Excellent';
        confidence = 90;
    } else if (yieldScore >= 75) {
        prediction = 'Good';
        confidence = 80;
    } else if (yieldScore >= 60) {
        prediction = 'Average';
        confidence = 70;
    } else if (yieldScore >= 40) {
        prediction = 'Below Average';
        confidence = 60;
    } else {
        prediction = 'Poor';
        confidence = 50;
    }

    const yieldPercentage = Math.min(100, Math.max(50, yieldScore));

    return {
        prediction: prediction,
        percentage: yieldPercentage,
        confidence: confidence,
        factors: factors
    };
}

async function generateMarketSuggestion(crop, state, district) {
    const cropInfo = cropDatabase[crop.toLowerCase()];
    if (!cropInfo) {
        return {
            suggestion: 'No market data available',
            trend: 'Unknown',
            livePrices: null,
            priceStats: null
        };
    }

    const currentMonth = new Date().toLocaleString('en-US', { month: 'short' }).toLowerCase();
    const isInSeason = cropInfo.marketSeasons.includes(currentMonth);

    let suggestion = '';
    let trend = '';
    let priceExpectation = '';

    if (isInSeason) {
        suggestion = `${cropInfo.name} is currently in harvest season. Market supply is high.`;
        trend = 'Stable';
        priceExpectation = 'Prices may be moderate due to high supply';

        const seasonIndex = cropInfo.marketSeasons.indexOf(currentMonth);
        if (seasonIndex === 0) {
            suggestion = `${cropInfo.name} harvest season just started. Early harvest commands premium prices.`;
            trend = 'Rising';
            priceExpectation = 'Higher prices expected in early season';
        } else if (seasonIndex === cropInfo.marketSeasons.length - 1) {
            suggestion = `${cropInfo.name} season is ending. Limited supply expected.`;
            trend = 'Rising';
            priceExpectation = 'Prices expected to rise as season ends';
        }
    } else {
        suggestion = `${cropInfo.name} is currently out of season. Off-season prices are typically higher.`;
        trend = 'Rising';
        priceExpectation = 'Premium prices for off-season produce';
    }

    suggestion += ' Consider storing produce if storage facilities are available.';

    let livePrices = null;
    let priceStats = null;

    try {
        livePrices = await fetchLiveCropPrices(crop, state, district);
        priceStats = await getCropPriceStats(crop);

        if (livePrices && livePrices.length > 0) {
            const avgPrice = priceStats?.averagePrice || livePrices[0].modalPrice;
            suggestion += ` Current average price: ₹${avgPrice}/Quintal across ${priceStats?.marketCount || livePrices.length} markets.`;

            if (priceStats && priceStats.maxPrice > priceStats.averagePrice * 1.3) {
                trend = 'Rising';
                priceExpectation = 'Prices are currently high in some markets';
            } else if (priceStats && priceStats.minPrice < priceStats.averagePrice * 0.7) {
                trend = 'Falling';
                priceExpectation = 'Prices vary significantly across regions';
            }
        }
    } catch (error) {
        console.error('Error fetching live prices for market suggestion:', error.message);
    }

    return {
        suggestion: suggestion,
        trend: trend,
        priceExpectation: priceExpectation,
        season: cropInfo.marketSeasons.join(', '),
        livePrices: livePrices ? livePrices.map(p => ({
            state: p.state,
            district: p.district,
            market: p.market,
            minPrice: p.minPrice,
            maxPrice: p.maxPrice,
            modalPrice: p.modalPrice,
            unit: p.unit,
            variety: p.variety,
            arrivalDate: p.arrivalDate
        })) : null,
        priceStats: priceStats
    };
}

async function generateAdvisory(input) {
    const { crop, growthStage, state, district, soilPH, soilType } = input;

    if (!crop || !growthStage) {
        throw new Error('Crop and growth stage are required');
    }

    const weather = await fetchWeatherData(state, district);

    const irrigation = calculateIrrigationAdvice(weather, crop, soilType, growthStage);
    const disease = calculateDiseaseRisk(weather, crop, growthStage);
    const fertilizer = calculateFertilizerRecommendation(crop, growthStage, soilType || 'loam', soilPH || '7.0');
    const yieldPrediction = calculateYieldPrediction(crop, weather, growthStage, soilType || 'loam');
    const market = await generateMarketSuggestion(crop, state, district);

    return {
        input: {
            crop: crop,
            growthStage: growthStage,
            location: { state, district },
            soil: { type: soilType || 'loam', ph: soilPH || '7.0' }
        },
        weather: {
            temperature: weather.temperature,
            humidity: weather.humidity,
            description: weather.description,
            rainfall: weather.rainfall
        },
        irrigationAdvice: irrigation.advice,
        irrigationUrgency: irrigation.urgency,
        diseaseRisk: disease.risk,
        diseaseLevel: disease.level,
        diseaseFactors: disease.factors,
        activeDiseases: disease.diseases,
        diseaseRecommendation: disease.recommendation,
        fertilizerRecommendation: fertilizer.recommendation,
        npk: fertilizer.npk,
        fertilizerApplication: fertilizer.applicationMethod,
        yieldPrediction: yieldPrediction.prediction,
        yieldPercentage: yieldPrediction.percentage,
        yieldConfidence: yieldPrediction.confidence,
        yieldFactors: yieldPrediction.factors,
        marketSuggestion: market.suggestion,
        marketTrend: market.trend,
        priceExpectation: market.priceExpectation,
        livePrices: market.livePrices,
        priceStats: market.priceStats
    };
}

module.exports = {
    generateAdvisory,
    generateOpenAIAdvisory,
    fetchWeatherData,
    calculateIrrigationAdvice,
    calculateDiseaseRisk,
    calculateFertilizerRecommendation,
    calculateYieldPrediction,
    generateMarketSuggestion,
    cropDatabase,
    soilDatabase
};
