import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import './App.css';

function App() {
  const [sensorData, setSensorData] = useState({
    temperature: [],
    humidity: [],
    pressure: [],
  });

  const chartRef = useRef(null); 
  const wsRef = useRef(null); 
  const canvasRef = useRef(null);

  useEffect(() => {
   
    wsRef.current = new WebSocket('ws://localhost:8082');

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setSensorData((prevData) => ({
        temperature: [...prevData.temperature, data.temperature].slice(-20),
        humidity: [...prevData.humidity, data.humidity].slice(-20),
        pressure: [...prevData.pressure, data.pressure].slice(-20),
      }));
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
   
    const ctx = canvasRef.current.getContext('2d'); 

    if (!chartRef.current) {
      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: Array.from({ length: sensorData.temperature.length }, (_, i) => i),
          datasets: [
            {
              label: 'Temperature (°C)',
              data: sensorData.temperature,
              borderColor: 'rgba(255, 99, 132, 1)',
              fill: false,
            },
            {
              label: 'Humidity (%)',
              data: sensorData.humidity,
              borderColor: 'rgba(54, 162, 235, 1)',
              fill: false,
            },
            {
              label: 'Pressure (hPa)',
              data: sensorData.pressure,
              borderColor: 'rgba(75, 192, 192, 1)',
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: { display: true },
            y: { display: true },
          },
        },
      });
    } else {
      
      chartRef.current.data.labels = Array.from({ length: sensorData.temperature.length }, (_, i) => i);
      chartRef.current.data.datasets[0].data = sensorData.temperature;
      chartRef.current.data.datasets[1].data = sensorData.humidity;
      chartRef.current.data.datasets[2].data = sensorData.pressure;
      chartRef.current.update();
    }

    
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [sensorData]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <h1 >Real-Time Sensor Data Dashboard</h1>
        <canvas ref={canvasRef} style={{ height: '100px', width: '100vw' }}></canvas>
    </div>
  );
}

export default App;
