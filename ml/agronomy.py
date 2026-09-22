"""
Phoenix AI – Crop advisory agronomy knowledge base.

The ML model predicts the crop (class + calibrated probability). This module
turns that prediction into plain-language advisory text using documented
agronomic guidance per crop (general practice values, not a substitute for
local extension advice).

Everything shown to the farmer therefore comes from:
   trained model output  +  real input values  +  this knowledge base.
Nothing is randomly generated.
"""

# ---------------------------------------------------------------------------
# Generic growth-stage ladder (works for all crops in the dataset)
# ---------------------------------------------------------------------------
GROWTH_STAGES = [
    "Sowing / Germination",
    "Vegetative growth",
    "Flowering / Fruit setting",
    "Fruit / Grain development",
    "Maturity / Harvest",
]

# ---------------------------------------------------------------------------
# Per-crop knowledge base
# ---------------------------------------------------------------------------
# moisture_need: 1 = low, 2 = medium, 3 = high water requirement
# attention:     1 = low, 2 = medium, 3 = high disease/pest pressure
# nutrient:      "N" nitrogen-favouring, "P" phosphorus-favouring,
#                "K" potassium-favouring, "B" balanced
CROP_KB = {
    "rice": {
        "moisture_need": 3, "attention": 3, "nutrient": "N",
        "disease_notes": ["blast and bacterial leaf blight risk in humid weather",
                          "brown planthopper outbreaks in dense canopies"],
        "care_notes": ["maintain 3–5 cm standing water during tillering",
                       "drain the field 7–10 days before harvest"],
        "harvest_window": "110–135 days", "yield_q_ac": (18, 26),
        "note": "a high-water cereal that needs standing moisture for most of its life",
    },
    "maize": {
        "moisture_need": 2, "attention": 2, "nutrient": "N",
        "disease_notes": ["fall armyworm and stem borer attack from whorl to tasseling",
                          "downy mildew in cool, wet conditions"],
        "care_notes": ["protect the crop during the silking window – it is most water-sensitive then",
                       "scout weekly for leaf feeding damage"],
        "harvest_window": "90–110 days", "yield_q_ac": (20, 30),
        "note": "a nitrogen-responsive cereal that is most sensitive to stress at silking",
    },
    "chickpea": {
        "moisture_need": 1, "attention": 2, "nutrient": "P",
        "disease_notes": ["fusarium wilt in warm soil", "pod borer damage at podding"],
        "care_notes": ["legume – it fixes its own nitrogen, avoid excess N",
                       "avoid waterlogging, roots rot in standing water"],
        "harvest_window": "95–110 days", "yield_q_ac": (6, 10),
        "note": "a cool-season legume that needs little irrigation and no extra nitrogen",
    },
    "kidneybeans": {
        "moisture_need": 2, "attention": 1, "nutrient": "P",
        "disease_notes": ["root rot when over-watered"],
        "care_notes": ["legume – low nitrogen requirement", "keep soil evenly moist, never waterlogged"],
        "harvest_window": "100–120 days", "yield_q_ac": (8, 12),
        "note": "a legume crop with moderate water needs and low fertiliser demand",
    },
    "pigeonpeas": {
        "moisture_need": 2, "attention": 2, "nutrient": "P",
        "disease_notes": ["pod borer is the main pest", "wilt in poorly drained soils"],
        "care_notes": ["long-duration legume – nitrogen-fixing", "prune early to encourage branching"],
        "harvest_window": "140–180 days", "yield_q_ac": (8, 12),
        "note": "a hardy legume that tolerates dry spells once established",
    },
    "mothbeans": {
        "moisture_need": 1, "attention": 1, "nutrient": "P",
        "disease_notes": ["few serious pests – very hardy crop"],
        "care_notes": ["ideal for dry, low-input conditions", "legume – no nitrogen top-dressing needed"],
        "harvest_window": "75–90 days", "yield_q_ac": (3, 6),
        "note": "a drought-tolerant short-duration legume for dry regions",
    },
    "mungbean": {
        "moisture_need": 2, "attention": 2, "nutrient": "P",
        "disease_notes": ["yellow mosaic virus spread by whitefly in warm weather"],
        "care_notes": ["legume – minimal nitrogen", "harvest in 2–3 pickings as pods mature unevenly"],
        "harvest_window": "60–75 days", "yield_q_ac": (5, 8),
        "note": "a quick legume that suits short windows between main crops",
    },
    "blackgram": {
        "moisture_need": 2, "attention": 2, "nutrient": "P",
        "disease_notes": ["yellow mosaic virus in summer", "powdery mildew in humid shade"],
        "care_notes": ["legume – low nitrogen requirement", "avoid water stagnation after flowering"],
        "harvest_window": "70–90 days", "yield_q_ac": (4, 7),
        "note": "a short-duration legume, good for kharif/rabi rotations",
    },
    "lentil": {
        "moisture_need": 1, "attention": 1, "nutrient": "P",
        "disease_notes": ["rust in humid, overcast weather"],
        "care_notes": ["legume – fixes nitrogen", "low irrigation crop, avoid overwatering"],
        "harvest_window": "100–120 days", "yield_q_ac": (6, 9),
        "note": "a cool-season legume for dryland rabi areas",
    },
    "pomegranate": {
        "moisture_need": 2, "attention": 3, "nutrient": "K",
        "disease_notes": ["bacterial blight in humid spells", "fruit borer damage"],
        "care_notes": ["prune for open canopy to reduce disease", "fruit cracking when irrigation is irregular"],
        "harvest_window": "150–180 days", "yield_q_ac": (25, 40),
        "note": "a high-value fruit that rewards careful disease and water management",
    },
    "banana": {
        "moisture_need": 3, "attention": 3, "nutrient": "K",
        "disease_notes": ["sigatoka leaf spot in wet weather", "panama wilt in infected soils"],
        "care_notes": ["needs heavy and regular feeding", "remove old leaves to reduce disease pressure"],
        "harvest_window": "11–14 months", "yield_q_ac": (120, 180),
        "note": "a heavy feeder with very high water and potassium demand",
    },
    "mango": {
        "moisture_need": 2, "attention": 2, "nutrient": "K",
        "disease_notes": ["hoppers and anthracnose in flowering season", "powdery mildew in cool humidity"],
        "care_notes": ["light irrigation stress before flowering improves flowering",
                       "mulch the root zone to retain moisture"],
        "harvest_window": "3–5 months after flowering", "yield_q_ac": (40, 80),
        "note": "a long-lived tree crop – management pays back over many seasons",
    },
    "grapes": {
        "moisture_need": 2, "attention": 2, "nutrient": "K",
        "disease_notes": ["downy and powdery mildew in humid conditions"],
        "care_notes": ["train on trellis for airflow", "controlled irrigation improves berry quality"],
        "harvest_window": "120–150 days after pruning", "yield_q_ac": (40, 60),
        "note": "a high-value crop where canopy and water control drive quality",
    },
    "watermelon": {
        "moisture_need": 2, "attention": 2, "nutrient": "B",
        "disease_notes": ["fruit fly damage", "downy mildew in wet weather"],
        "care_notes": ["drip irrigation avoids wet foliage", "turn fruit gently to prevent sun scald"],
        "harvest_window": "80–95 days", "yield_q_ac": (60, 100),
        "note": "a vining crop that needs steady moisture until fruit set, then less",
    },
    "muskmelon": {
        "moisture_need": 2, "attention": 2, "nutrient": "B",
        "disease_notes": ["powdery mildew late in the season", "fruit fly"],
        "care_notes": ["reduce irrigation as fruits ripen for sweetness",
                       "good drainage is essential"],
        "harvest_window": "80–90 days", "yield_q_ac": (50, 80),
        "note": "a warm-season vine that prefers light, well-drained soils",
    },
    "apple": {
        "moisture_need": 2, "attention": 2, "nutrient": "B",
        "disease_notes": ["scab in wet, cool springs"],
        "care_notes": ["needs winter chilling", "thin fruit for size and quality"],
        "harvest_window": "130–150 days after flowering", "yield_q_ac": (40, 80),
        "note": "a temperate tree crop requiring cool winters",
    },
    "orange": {
        "moisture_need": 2, "attention": 2, "nutrient": "B",
        "disease_notes": ["citrus canker", "leaf miner on new flushes"],
        "care_notes": ["micronutrient (Zn, Fe) sprays support fruiting",
                       "avoid water stress during fruit set"],
        "harvest_window": "240–280 days after flowering", "yield_q_ac": (50, 90),
        "note": "a citrus crop that responds well to micronutrient management",
    },
    "papaya": {
        "moisture_need": 2, "attention": 2, "nutrient": "K",
        "disease_notes": ["ringspot virus transmitted by aphids", "root rot in wet soil"],
        "care_notes": ["excellent drainage is a must", "remove virus-infected plants early"],
        "harvest_window": "9–10 months", "yield_q_ac": (60, 100),
        "note": "a fast-growing fruit sensitive to waterlogging and virus",
    },
    "coconut": {
        "moisture_need": 2, "attention": 2, "nutrient": "K",
        "disease_notes": ["red palm weevil", "bud rot in waterlogged monsoon soil"],
        "care_notes": ["regular basin irrigation improves yield", "apply organic mulch in the basin"],
        "harvest_window": "nuts year-round", "yield_q_ac": (60, 90),
        "note": "a perennial palm needing year-round moisture and drainage",
    },
    "cotton": {
        "moisture_need": 2, "attention": 3, "nutrient": "B",
        "disease_notes": ["bollworm complex", "leaf curl virus spread by whitefly"],
        "care_notes": ["scout twice a week for sucking pests", "avoid late nitrogen that delays boll opening"],
        "harvest_window": "160–180 days", "yield_q_ac": (8, 12),
        "note": "a long-duration fibre crop with high pest-management demand",
    },
    "jute": {
        "moisture_need": 3, "attention": 1, "nutrient": "N",
        "disease_notes": ["stem rot in waterlogged fields"],
        "care_notes": ["grows fast – needs timely weeding in first month",
                       "retting requires clean water"],
        "harvest_window": "100–120 days", "yield_q_ac": (10, 14),
        "note": "a fibre crop that thrives in warm, humid, well-watered conditions",
    },
    "coffee": {
        "moisture_need": 2, "attention": 2, "nutrient": "B",
        "disease_notes": ["coffee berry borer", "leaf rust in warm, wet periods"],
        "care_notes": ["shade regulation controls berry quality and disease",
                       "timely picking prevents borer build-up"],
        "harvest_window": "210–270 days after flowering", "yield_q_ac": (4, 8),
        "note": "a shade-loving plantation crop sensitive to temperature swings",
    },
}

# ---------------------------------------------------------------------------
# Stage-wise guidance builders
# ---------------------------------------------------------------------------
_IRRIGATION = {
    3: [  # high moisture need
        "Keep the field continuously moist after sowing – the crop needs standing or near-standing moisture.",
        "Maintain steady water supply; do not let the root zone dry out during vegetative growth.",
        "Critical stage – any moisture stress now will cut yield sharply. Keep soil wet through flowering.",
        "Continue steady moisture to support grain/fruit filling.",
        "Begin draining about 7–10 days before harvest and stop irrigation.",
    ],
    2: [  # medium
        "Give a light irrigation immediately after sowing to ensure uniform germination.",
        "Irrigate when the top soil dries out – roughly 40–50% moisture depletion.",
        "Critical irrigation at flowering/fruit set – avoid moisture stress during this window.",
        "Gradually reduce irrigation frequency as the produce matures.",
        "Stop irrigation before harvest to improve quality and ease harvesting.",
    ],
    1: [  # low
        "One light irrigation after sowing is usually enough to establish the crop.",
        "Irrigate only if a dry spell stretches beyond 10–12 days.",
        "Give at most one protective irrigation if the crop shows wilting at flowering.",
        "Avoid excess moisture now – it invites rot and reduces quality.",
        "No irrigation needed; allow the field to dry for harvest.",
    ],
}

_FERTILIZER = {
    "N": [  # nitrogen-favouring crops
        "Apply a balanced basal dose (P and K full, N split into 3 parts).",
        "Top-dress one-third of the nitrogen now – this drives leaf and tiller growth.",
        "Apply the second nitrogen split before flowering for better head/fruit size.",
        "A small nitrogen top-up plus potassium supports grain filling; avoid late heavy N.",
        "Stop nitrogen application – excess N delays maturity.",
    ],
    "P": [  # phosphorus-favouring crops (legumes)
        "Apply a phosphorus-rich basal dose; use rhizobium seed treatment for legumes.",
        "A light phosphorus side-dressing helps early root development; no nitrogen top-dressing needed.",
        "Potassium helps pod setting – a small dose at flowering is beneficial.",
        "Avoid extra nitrogen; the crop fixes its own. Watch for pod borers instead.",
        "No further fertiliser application required.",
    ],
    "K": [  # potassium-favouring crops (fruits)
        "Apply a balanced basal dose with organic manure mixed into the root zone.",
        "Nitrogen split now supports canopy growth; keep potassium steady.",
        "Potassium is key at fruit set – apply the K split now for size and quality.",
        "Continue potassium plus micronutrients (Zn/B) for fruit development.",
        "Stop nitrogen; potassium can continue lightly until near harvest.",
    ],
    "B": [  # balanced crops
        "Apply a full NPK basal dose as per soil test with well-rotted manure.",
        "Split-apply nitrogen to match crop growth; avoid a single heavy dose.",
        "Potassium improves flowering and stress tolerance – apply now.",
        "A light potassium + micronutrient dose supports filling and quality.",
        "Stop fertiliser application before harvest.",
    ],
}

_MAINTENANCE = [
    "Ensure clean, weed-free rows so the crop does not compete for nutrients.",
    "Continue regular weeding and check for early pest feeding damage.",
    "Scout weekly for pests/diseases; remove affected plants early.",
    "Keep the field clean and support plants where lodging is possible.",
    "Prepare for harvest – arrange grading, packing and transport in advance.",
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def stage_index(stage: str | None) -> int:
    """Map a growth-stage string to its index (defaults to vegetative)."""
    if not stage:
        return 1
    s = stage.strip().lower()
    for i, name in enumerate(GROWTH_STAGES):
        if name.lower() in s or s in name.lower():
            return i
    return 1


def get_crop(crop: str) -> dict:
    return CROP_KB.get(crop.strip().lower(), CROP_KB["rice"])
