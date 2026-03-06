import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import sequelize from './config/database.js';
import apiRoutes from './routes/api.js';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Plant from './models/Plant.js';
import Aggregate from './models/Aggregate.js';
import Report from './models/Report.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Database Sync & Seed Admin User
const initDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL connected.');

        // Sync models (creates tables if they don't exist)
        await sequelize.sync({ force: false });

        // Seed Admin User
        const adminExists = await User.findOne({ where: { username: 'Admin General' } });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('1234', 10);
            await User.create({
                username: 'Admin General',
                password: hashedPassword,
                role: 'admin'
            });
            console.log('Seeded initial "Admin General" user.');
        }

        // Seed Default Plants
        const defaultPlants = ['CTE SUD', 'CTE GROZAVESTI', 'CTE PROGRESU', 'CTE VEST'];
        for (const plantName of defaultPlants) {
            const plantExists = await Plant.findOne({ where: { name: plantName } });
            if (!plantExists) {
                await Plant.create({ name: plantName });
                console.log(`Seeded plant: ${plantName}`);
            }
        }

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

app.listen(PORT, async () => {
    console.log(`Server will run on port ${PORT} after DB init`);
});

const startServer = async () => {
    await initDB();
    console.log(`Server fully initialized and running on port ${PORT}`);
};

startServer();
