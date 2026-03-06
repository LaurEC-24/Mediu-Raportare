import Plant from '../models/Plant.js';
import Aggregate from '../models/Aggregate.js';

export const getPlantsAndAggregates = async (req, res) => {
    try {
        const plants = await Plant.findAll({
            include: [{
                model: Aggregate,
                as: 'aggregates'
            }],
            order: [['name', 'ASC'], [{ model: Aggregate, as: 'aggregates' }, 'name', 'ASC']]
        });

        res.json(plants);
    } catch (error) {
        console.error('Error fetching plants:', error);
        res.status(500).json({ message: 'Server error fetching plants' });
    }
};

// Create a new Plant
export const createPlant = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Plant name is required' });

        const plant = await Plant.create({ name });
        res.status(201).json(plant);
    } catch (error) {
        console.error('Error creating plant:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Plant name exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a new Aggregate for a Plant
export const createAggregate = async (req, res) => {
    try {
        const { plantId } = req.params;
        const { name, limits } = req.body;

        if (!name) return res.status(400).json({ message: 'Aggregate name is required' });

        const plant = await Plant.findByPk(plantId);
        if (!plant) return res.status(404).json({ message: 'Plant not found' });

        const payload = { name, plantId };
        if (limits) payload.limits = limits;

        const aggregate = await Aggregate.create(payload);
        res.status(201).json(aggregate);
    } catch (error) {
        console.error('Error creating aggregate:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update Limits for an Aggregate
export const updateAggregateLimits = async (req, res) => {
    try {
        const { aggregateId } = req.params;
        const { limits } = req.body;

        const aggregate = await Aggregate.findByPk(aggregateId);
        if (!aggregate) return res.status(404).json({ message: 'Aggregate not found' });

        aggregate.limits = limits;
        await aggregate.save();

        res.json(aggregate);
    } catch (error) {
        console.error('Error updating limits:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete an Aggregate
export const deleteAggregate = async (req, res) => {
    try {
        const { aggregateId } = req.params;

        const aggregate = await Aggregate.findByPk(aggregateId);
        if (!aggregate) return res.status(404).json({ message: 'Aggregate not found' });

        await aggregate.destroy();
        res.json({ message: 'Aggregate deleted successfully' });
    } catch (error) {
        console.error('Error deleting aggregate:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a Plant
export const deletePlant = async (req, res) => {
    try {
        const { plantId } = req.params;

        const plant = await Plant.findByPk(plantId);
        if (!plant) return res.status(404).json({ message: 'Plant not found' });

        await plant.destroy(); // Due to CASCADE in DB models, aggregates should be deleted too.
        res.json({ message: 'Plant deleted successfully' });
    } catch (error) {
        console.error('Error deleting plant:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
