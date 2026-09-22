# Dataset: Crop Recommendation (`Crop_recommendation.csv`)

## Overview
The public **Crop Recommendation** benchmark dataset, widely used in Indian agriculture ML projects (Kaggle "Crop Recommendation Dataset" by atharvaingle, originally compiled from Indian agricultural reference values in the style of FAO / ICAR crop requirement tables).

- **Rows**: 2,200
- **Columns**: 8
- **Missing values**: 0
- **Duplicates**: 0
- **Class balance**: Perfectly balanced — 100 rows for each of 22 crops

## Schema & Features

| Column | Meaning | Unit / Range in Data |
|---|---|---|
| **N** | Soil nitrogen content (ratio index) | 0–140 |
| **P** | Soil phosphorus content (ratio index) | 5–145 |
| **K** | Soil potassium content (ratio index) | 5–205 |
| **temperature** | Seasonal mean temperature | °C, 8.8–43.7 |
| **humidity** | Relative humidity | %, 14.3–100 |
| **ph** | Soil pH | 3.5–9.9 |
| **rainfall** | Reference rainfall amount | mm, 20.2–298.6 |
| **label** | **TARGET** – Recommended/suitable crop | 22 crop names |

### Supported Crops (22 Classes)
`rice`, `maize`, `chickpea`, `kidneybeans`, `pigeonpeas`, `mothbeans`, `mungbean`, `blackgram`, `lentil`, `pomegranate`, `banana`, `mango`, `grapes`, `watermelon`, `muskmelon`, `apple`, `orange`, `papaya`, `coconut`, `cotton`, `jute`, `coffee`.

## Origin & Distribution
Downloaded from a public mirror of the Kaggle dataset:
`https://raw.githubusercontent.com/gireesh777/Crop_Recommendation_System_using_ML/master/Dataset/Crop_recommendation.csv`

It is a benchmark/educational dataset. No synthetic data is generated in this project — training uses this file exactly as downloaded (verified: 2,200 rows, no missing/duplicate values, all 22 classes balanced).

## Fit for the Advisory Task
The Phoenix AI advisory form collects crop, growth stage, soil pH/type, and location; weather values (temperature, humidity, rainfall) can be attached from the platform's weather module. The model classifies the field profile into one of 22 crops with a calibrated probability. That predicted class is the anchor for the advisory: risk level, irrigation/fertiliser/soil recommendations, weather precautions, and preventive actions are generated from an agronomy knowledge base keyed by the predicted crop, growth stage, and input values.

## Limitations
- The dataset encodes static seasonal profiles, not time-series or live telemetry. Predictions are decision support.
- No field images, variety, or management history are included.
- Regional (state/district) data is not part of the model features; it is accepted by the API and echoed in the response meta, but the model itself uses only the seven numeric features above.
