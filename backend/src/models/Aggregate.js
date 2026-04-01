import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Plant from './Plant.js';

const Aggregate = sequelize.define('Aggregate', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    plantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Plant,
            key: 'id',
        }
    },
    limits: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            "SO2": 100.0,
            "Nox": 100.0,
            "Pulberi": 10.0,
            "CO": 50.0,
            "O2": 21.0,
            "Umiditate mas": 100.0,
            "Temperatura": 200.0,
            "Presiune": 1500.0
        }
    }
});

Plant.hasMany(Aggregate, { foreignKey: 'plantId', as: 'aggregates' });
Aggregate.belongsTo(Plant, { foreignKey: 'plantId', as: 'plant' });

export default Aggregate;
