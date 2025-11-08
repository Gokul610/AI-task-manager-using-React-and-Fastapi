// frontend/src/components/charts/GanttChart.jsx

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
  // --- FIX: Removed unused 'Label' import ---
} from 'recharts';
import taskService from '../../services/taskService';

// --- Custom Tooltip ---
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const { title, start, end, durationDays } = data;
    
    const startDate = new Date(start).toLocaleDateString();
    const endDate = new Date(end).toLocaleDateString();

    return (
      <div className="p-3 bg-card border border-border rounded shadow-lg text-sm text-card-foreground">
        <p className="font-semibold mb-1">{title}</p>
        <p><strong>Start:</strong> {startDate}</p>
        <p><strong>Due:</strong> {endDate}</p>
        <p><strong>Duration:</strong> {durationDays} day(s)</p>
      </div>
    );
  }
  return null;
};

// --- Custom Shape for the Gantt bar ---
// --- FIX: Removed unused 'fill' from props ---
const GanttBar = (props) => {
  const { x, y, width, height, payload } = props;
  
  // Use a subtle fill color, maybe based on completion
  const barFill = payload.completed ? 'hsl(var(--priority-low))' : 'hsl(var(--chart-accent))';

  if (width <= 0) return null; // Don't render zero-width bars

  return (
    <rect 
      x={x} 
      y={y - height / 2} // Center the bar on the Y-axis tick
      width={width} 
      height={height} 
      fill={barFill} 
      fillOpacity={0.7} 
      rx={4} // Rounded corners
      ry={4}
    />
  );
};


const GanttChart = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [domain, setDomain] = useState([0, 0]);
    const [taskNames, setTaskNames] = useState([]);

    // --- Fetch Data Effect ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch ALL tasks
                const allTasks = await taskService.getAllTasks({ status: 'all' });
                
                // 2. Filter tasks that can be plotted (must have a start and end)
                const usableTasks = allTasks.filter(task => task.created_at && task.due_date);
                
                if (usableTasks.length === 0) {
                   setLoading(false);
                   return;
                }

                // 3. Format data for the chart
                const formattedData = usableTasks.map((task, index) => {
                    const start = new Date(task.created_at).getTime();
                    const end = new Date(task.due_date).getTime();
                    const durationMs = Math.max(0, end - start); // Ensure no negative duration
                    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24)); // Duration in days
                    
                    return {
                        title: task.title,
                        yIndex: index, // Each task gets its own row
                        start: start,
                        end: end,
                        durationMs: durationMs,
                        durationDays: durationDays,
                        completed: task.completed,
                    };
                });
                
                // 4. Calculate domain for X-Axis (time)
                const minStart = Math.min(...formattedData.map(d => d.start));
                const maxEnd = Math.max(...formattedData.map(d => d.end));
                
                // Add a little padding to the domain
                const padding = (maxEnd - minStart) * 0.05;

                setData(formattedData);
                setDomain([minStart - padding, maxEnd + padding]);
                setTaskNames(formattedData.map(d => d.title)); // For Y-axis labels
                setLoading(false);

            } catch (err) {
                console.error("Failed to fetch task data for Gantt:", err);
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
    
    if (loading) {
        return <div className="text-center py-8 text-muted-foreground">Loading chart...</div>;
    }
    if (error) {
        return <div className="text-center py-8 text-destructive-foreground">{error}</div>;
    }
     if (data.length === 0) {
        return <div className="text-center py-8 text-muted-foreground">No tasks with both a start and due date to display.</div>;
    }
    
    return (
        <ResponsiveContainer width="100%" height={data.length * 40 + 60}> {/* Dynamic height */}
        <ScatterChart 
             // --- FIX: Increased left margin for labels ---
             margin={{ top: 20, right: 30, bottom: 20, left: 200 }} 
        >
            <CartesianGrid strokeDasharray="3 3" stroke={axisColor} strokeOpacity={0.3}/>
            <XAxis
                dataKey="start"
                type="number"
                domain={domain}
                scale="time"
                tickFormatter={(time) => new Date(time).toLocaleDateString()}
                stroke={axisColor}
                tick={{ fill: textColor, fontSize: 12 }}
            />
            <YAxis
                dataKey="yIndex" // Use the numerical index for plotting
                type="category"
                ticks={taskNames.map((_, index) => index)} // Use index for ticks
                tickFormatter={(index) => taskNames[index]} // Use title for label
                stroke={axisColor}
                // --- FIX: Increased width for labels and set textAnchor ---
                tick={{ fill: textColor, fontSize: 12, width: 180, textAnchor: 'end' }} 
                interval={0}
                domain={[0, data.length]}
                reversed={true} // Show first task at the top
            />
            {/* ZAxis controls the *width* of the GanttBar shape */}
            <ZAxis dataKey="durationMs" range={[0, 1000]} /> 
            
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: axisColor }} />
            
            <Scatter
                data={data}
                shape={<GanttBar />}
                line // This connects the "dots", which we've hidden
                lineJointType="miter"
                isAnimationActive={false}
            />
        </ScatterChart>
        </ResponsiveContainer>
    );
};

export default GanttChart;