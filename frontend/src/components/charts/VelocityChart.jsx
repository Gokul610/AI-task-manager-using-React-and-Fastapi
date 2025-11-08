// frontend/src/components/charts/VelocityChart.jsx

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import insightsService from '../../services/insightsService'; // <-- NEW IMPORT

// --- Custom Tooltip for Dark Theme (remains the same) ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-card border border-border rounded shadow-lg text-sm text-card-foreground">
        <p className="font-semibold">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const VelocityChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // --- Fetch Data Effect ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const burndownData = await insightsService.getBurndownData();
        setData(burndownData);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch burndown data:", err);
        setError("Failed to load chart data.");
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  // -------------------------

  // Use theme colors
  const axisColor = 'hsl(var(--muted-foreground))'; 
  const textColor = 'hsl(var(--foreground))';     
  const accentColor = 'hsl(var(--chart-accent))'; 
  const idealColor = 'hsl(var(--muted-foreground))'; 

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading chart...</div>;
  }
  if (error) {
    return <div className="text-center py-8 text-destructive-foreground">{error}</div>;
  }
  
  // Determine if the actual remaining work is above the ideal line for status reporting
  const lastActual = data[data.length - 1]?.remaining || 0;
  const lastIdeal = data[data.length - 1]?.ideal || 0;
  let statusText = "On Track";
  if (lastActual > lastIdeal + 10) { // arbitrary threshold
    statusText = "Falling Behind";
  } else if (lastActual > lastIdeal + 5) {
    statusText = "At Risk";
  }

  return (
    <div className="space-y-4">
        {/* Predictive Status Display (New Feature) */}
        <p className="text-center font-medium">
             Project Status: <span className={`font-bold ${statusText === "Falling Behind" ? 'text-destructive' : statusText === "At Risk" ? 'text-priority-medium' : 'text-priority-low'}`}>{statusText}</span>
        </p>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }} 
          >
            <CartesianGrid strokeDasharray="3 3" stroke={axisColor} strokeOpacity={0.3} />
            <XAxis dataKey="name" stroke={axisColor} tick={{ fill: textColor, fontSize: 12 }} />
            <YAxis
              stroke={axisColor}
              tick={{ fill: textColor, fontSize: 12 }}
              label={{ value: 'Work Units Remaining', angle: -90, position: 'insideLeft', fill: textColor, fontSize: 14, dx: -10 }} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: axisColor, strokeDasharray: '3 3' }}/>
            <Legend wrapperStyle={{ fontSize: '12px', color: textColor }} />
            <Line
              type="monotone"
              dataKey="ideal"
              stroke={idealColor} 
              strokeDasharray="5 5"
              name="Ideal Burndown"
              dot={false} 
            />
            <Line
              type="monotone"
              dataKey="remaining"
              stroke={accentColor} 
              strokeWidth={2}
              name="Predicted Remaining"
              dot={{ r: 4, fill: accentColor }} 
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
    </div>
  );
};

export default VelocityChart;