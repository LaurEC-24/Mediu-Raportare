import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Plant from './Plant.js';
import Aggregate from './Aggregate.js';

const Report = sequelize.define('Report', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    plantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Plant,
            key: 'id',
        }
    },
    aggregateId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Aggregate,
            key: 'id',
        }
    },
    reportMonth: {
        type: DataTypes.STRING, // Ex: "Ianuarie 2026", "2026-01"
        allowNull: false,
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    exceedances: {
        type: DataTypes.JSONB,
        defaultValue: [],
    },
    discrepancies: {
        type: DataTypes.JSONB,
        defaultValue: [],
    },
    siteMismatches: {
        type: DataTypes.JSONB,
        defaultValue: [],
    },
    downtimeRecords: {
        type: DataTypes.JSONB,
        defaultValue: [],
    },
    activeLimits: {
        type: DataTypes.JSONB,
        defaultValue: {},
    }
});

Plant.hasMany(Report, { foreignKey: 'plantId', as: 'reports' });
Report.belongsTo(Plant, { foreignKey: 'plantId', as: 'plant' });

Aggregate.hasMany(Report, { foreignKey: 'aggregateId', as: 'reports' });
Report.belongsTo(Aggregate, { foreignKey: 'aggregateId', as: 'aggregate' });

export default Report;
