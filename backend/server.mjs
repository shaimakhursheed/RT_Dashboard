import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';

dotenv.config();

const app = express();
const expressPort = process.env.PORT || 8081; 
const wsPort = 8082; 

app.use(cors());

let dbConnection;

const startServer = async () => {
    try {
    
        dbConnection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        console.log('Connected to MySQL database.');

    
        const wss = new WebSocketServer({ port: wsPort });
        console.log(`WebSocket server is running on ws://localhost:${wsPort}`);

    
        const generateData = async () => {
            const temperature = (Math.random() * 35 + 15).toFixed(2); 
            const humidity = (Math.random() * 50 + 30).toFixed(2);    
            const pressure = (Math.random() * 20 + 980).toFixed(2);  

            const query = `INSERT INTO readings (temperature, humidity, pressure) VALUES (?, ?, ?)`;
            try {
                await dbConnection.execute(query, [temperature, humidity, pressure]);
                console.log(`Inserted data: Temperature=${temperature}°C, Humidity=${humidity}%, Pressure=${pressure} hPa`);
            } catch (err) {
                console.error('Error inserting data:', err);
            }
        };

    
        setInterval(generateData, 500);

    
        const broadcastData = async () => {
            try {
                const [rows] = await dbConnection.execute(
                    'SELECT temperature, humidity, pressure FROM readings ORDER BY id DESC LIMIT 1'
                );
                const data = rows[0];
                wss.clients.forEach((client) => {
                    if (client.readyState === 1) { 
                        client.send(JSON.stringify(data));
                    }
                });
            } catch (err) {
                console.error('Error broadcasting data:', err);
            }
        };

    
        setInterval(broadcastData, 500);


        app.get('/api/data', async (req, res) => {
            try {
                const [rows] = await dbConnection.execute(
                    'SELECT temperature, humidity, pressure FROM readings ORDER BY id DESC LIMIT 10'
                );
                res.json(rows);
            } catch (err) {
                res.status(500).json({ error: 'Error fetching data' });
            }
        });

        
        app.listen(expressPort, () => {
            console.log(`Express server running on http://localhost:${expressPort}`);
        });

    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1); 
    }
};


process.on('SIGINT', async () => {
    try {
        if (dbConnection) {
            await dbConnection.end();
            console.log('MySQL connection closed.');
        }
    } catch (err) {
        console.error('Error closing MySQL connection:', err);
    }
    process.exit();
});

startServer();
