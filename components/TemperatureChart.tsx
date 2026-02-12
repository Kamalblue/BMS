
import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Line, ComposedChart } from 'recharts';
import { BatteryDataPoint } from '../types';

interface Props {
  data: BatteryDataPoint[];
  showVoltage?: boolean;
}

export const TemperatureChart: React.FC<Props> = ({ data, showVoltage = false }) => {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorTwin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="time" hide />
          <YAxis yAxisId="left" unit="°C" fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" />
          {showVoltage && <YAxis yAxisId="right" orientation="right" unit="V" fontSize={10} tickLine={false} axisLine={false} stroke="#8b5cf6" />}
          
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
            itemStyle={{ fontSize: '11px', padding: '2px 0' }}
          />
          
          <Area 
            yAxisId="left"
            type="monotone" 
            dataKey="temperature" 
            stroke="#ef4444" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorTemp)" 
            name="Real Temp"
          />
          <Area 
            yAxisId="left"
            type="monotone" 
            dataKey="twinBaseline" 
            stroke="#3b82f6" 
            strokeWidth={2}
            strokeDasharray="5 5"
            fillOpacity={1} 
            fill="url(#colorTwin)" 
            name="Twin Baseline"
          />

          {showVoltage && (
            <>
              <Line 
                yAxisId="right"
                type="stepAfter"
                dataKey="voltage"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="Voltage"
              />
              <Line 
                yAxisId="right"
                type="stepAfter"
                dataKey="voltageTwin"
                stroke="#a78bfa"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                name="Voltage Twin"
              />
            </>
          )}

          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="ambientTemp" 
            stroke="#94a3b8" 
            dot={false}
            strokeWidth={1}
            name="Ambient"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
