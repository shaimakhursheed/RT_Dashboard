import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';

dotenv.config();

const app = express();
const expressPort = process.env.PORT || 8081; // Express server port
const wsPort = 8082; // WebSocket server port, different from Express

app.use(cors());

let dbConnection;

const startServer = async () => {
    try {
        // MySQL connection (used for both data generation and Express/WebSocket)
        dbConnection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        console.log('Connected to MySQL database.');

        // WebSocket server on port 8082
        const wss = new WebSocketServer({ port: wsPort });
        console.log(`WebSocket server is running on ws://localhost:${wsPort}`);

        // Function to generate random sensor data and insert into MySQL
        const generateData = async () => {
            const temperature = (Math.random() * 35 + 15).toFixed(2); // Temperature between 15°C and 50°C
            const humidity = (Math.random() * 50 + 30).toFixed(2);    // Humidity between 30% and 80%
            const pressure = (Math.random() * 20 + 980).toFixed(2);   // Pressure between 980 hPa and 1000 hPa

            const query = `INSERT INTO readings (temperature, humidity, pressure) VALUES (?, ?, ?)`;
            try {
                await dbConnection.execute(query, [temperature, humidity, pressure]);
                console.log(`Inserted data: Temperature=${temperature}°C, Humidity=${humidity}%, Pressure=${pressure} hPa`);
            } catch (err) {
                console.error('Error inserting data:', err);
            }
        };

        // Insert random data every 500ms
        setInterval(generateData, 500);

        // Function to broadcast the most recent sensor data to all connected clients
        const broadcastData = async () => {
            try {
                const [rows] = await dbConnection.execute(
                    'SELECT temperature, humidity, pressure FROM readings ORDER BY id DESC LIMIT 1'
                );
                const data = rows[0];
                wss.clients.forEach((client) => {
                    if (client.readyState === 1) { // 1 = WebSocket.OPEN
                        client.send(JSON.stringify(data));
                    }
                });
            } catch (err) {
                console.error('Error broadcasting data:', err);
            }
        };

        // Broadcast the latest data every 500ms
        setInterval(broadcastData, 500);

        // REST API to fetch recent sensor data
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

        // Start Express server on port 8081
        app.listen(expressPort, () => {
            console.log(`Express server running on http://localhost:${expressPort}`);
        });

    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1); // Exit the process if there's a fatal error
    }
};

// Gracefully handle MySQL connection termination and server shutdown
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

// Start the server
startServer();
