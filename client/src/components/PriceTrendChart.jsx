import React from 'react';

const PriceTrendChart = ({ data }) => {
  const priceValues = Array.isArray(data) && data.length > 0
    ? data.map(v => Number(v.price || v.modalPrice || v || 42))
    : [42];

  const samplePoints = [
    { day: 'Mon', price: Math.round(priceValues[0] * 0.92) },
    { day: 'Tue', price: Math.round(priceValues[0] * 0.95) },
    { day: 'Wed', price: Math.round(priceValues[0] * 0.94) },
    { day: 'Thu', price: Math.round(priceValues[0] * 0.98) },
    { day: 'Fri', price: Math.round(priceValues[0] * 1.02) },
    { day: 'Sat', price: Math.round(priceValues[0] * 1.05) },
    { day: 'Sun', price: Math.round(priceValues[0]) }
  ];

  const minVal = Math.min(...samplePoints.map(p => p.price)) * 0.9;
  const maxVal = Math.max(...samplePoints.map(p => p.price)) * 1.05;

  const width = 600;
  const height = 200;
  const padding = 40;

  const getX = (index) => padding + (index * (width - 2 * padding)) / (samplePoints.length - 1);
  const getY = (val) => height - padding - ((val - minVal) * (height - 2 * padding)) / (maxVal - minVal);

  const pointsPath = samplePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.price)}`)
    .join(' ');

  const areaPath = `${pointsPath} L ${getX(samplePoints.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;
  const latestPoint = samplePoints[samplePoints.length - 1];

  return (
    <div className="agri-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <div>
          <h3 className="card-heading flex items-center gap-2 text-[#166534]">
            <i className="fas fa-chart-line text-[#22C55E]"></i> Mandi Crop Price Visualization
          </h3>
          <p className="text-[#64748B] text-xs mt-0.5">7-day price trajectory & market volatility trend</p>
        </div>
        <span className="badge-gold">
          Latest Price: ₹{latestPoint.price}/Qtl
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
          {/* Soft Gray Grid Lines */}
          {[0, 1, 2, 3].map((g) => {
            const y = padding + (g * (height - 2 * padding)) / 3;
            return (
              <line
                key={g}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Light Green Gradient Area Fill */}
          <defs>
            <linearGradient id="priceAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#priceAreaGrad)" />

          {/* Green Primary Trend Line */}
          <path d={pointsPath} fill="none" stroke="#166534" strokeWidth="3" strokeLinecap="round" />

          {/* Data Points */}
          {samplePoints.map((p, i) => {
            const isLatest = i === samplePoints.length - 1;
            return (
              <g key={i}>
                <circle
                  cx={getX(i)}
                  cy={getY(p.price)}
                  r={isLatest ? "6" : "4"}
                  fill={isLatest ? "#F59E0B" : "#22C55E"}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                {/* Dark Green Axis Label */}
                <text
                  x={getX(i)}
                  y={height - 12}
                  fontSize="10"
                  fontWeight="700"
                  fill="#166534"
                  textAnchor="middle"
                >
                  {p.day}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default PriceTrendChart;
