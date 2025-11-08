// frontend/src/components/charts/Heatmap.jsx

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import insightsService from '../../services/insightsService'; // <-- NEW IMPORT

const yAxisLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const xAxisLabels = [
  '12a', '1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a', '11a',
  '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '10p', '11p',
];

// Helper to map Day string to an index for the Y-Axis
const getDayIndex = (day) => yAxisLabels.indexOf(day);

// --- Custom Tooltip ---
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const day = data.day;
    const hourLabel = xAxisLabels[data.hour];
    
    return (
      <div className="p-2 bg-card border border-border rounded shadow-lg text-sm text-card-foreground">
        <p className="font-semibold">{`${day} at ${hourLabel}`}</p>
        <p>{`${data.value} tasks completed`}</p>
      </div>
    );
  }
  return null;
};

const Heatmap = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Fetch Data Effect ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const heatmapData = await insightsService.getHeatmapData();
                // Map day string to a number for the Y-Axis to work correctly
                const formattedData = heatmapData.map(item => ({
                    ...item,
                    dayIndex: getDayIndex(item.day) 
                }));
                setData(formattedData);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch heatmap data:", err);
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
    
    if (loading) {
        return <div className="text-center py-8 text-muted-foreground">Loading chart...</div>;
    }
    if (error) {
        return <div className="text-center py-8 text-destructive-foreground">{error}</div>;
    }
    
    // Calculate the max value for ZAxis range
    const maxVal = Math.max(...data.map(d => d.value), 1); 
    const zRange = [50, 800]; // Min size 50, Max size 800 (for visual impact)
    
    return (
        <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={axisColor} strokeOpacity={0.3}/>
            <XAxis
            dataKey="hour"
            type="number"
            domain={[0, 23]}
            ticks={[0, 4, 8, 12, 16, 20, 23]}
            tickFormatter={(hour) => xAxisLabels[hour]}
            stroke={axisColor}
            tick={{ fill: textColor, fontSize: 12 }}
            label={{ value: 'Time of Day (Hours)', position: 'bottom', fill: textColor, fontSize: 14 }}
            />
            <YAxis
            dataKey="dayIndex" // Use the numerical index for plotting
            type="category"
            domain={[0, yAxisLabels.length - 1]} // Domain from 0 to 6
            ticks={yAxisLabels.map((_, index) => index)}
            tickFormatter={(index) => yAxisLabels[index]} // Use string label for display
            reversed={true}
            stroke={axisColor}
            tick={{ fill: textColor, fontSize: 12 }}
            label={{ value: 'Day of Week', angle: -90, position: 'insideLeft', fill: textColor, fontSize: 14, dx: -10 }}
            />
            {/* ZAxis maps 'value' (task count) to the size of the square */}
            <ZAxis dataKey="value" range={zRange} domain={[1, maxVal]} /> 
            
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: axisColor }} />
            <Scatter
            data={data}
            fill={accentColor}
            shape="square"
            fillOpacity={0.9} 
            />
        </ScatterChart>
        </ResponsiveContainer>
    );
};

export default Heatmap;