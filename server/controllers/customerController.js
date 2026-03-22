const Customer = require('../models/Customer');

// @desc    Get all customers
// @route   GET /api/customers
const getCustomers = async (req, res) => {
    try {
        const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
        const customers = await Customer.find(filter).sort({ createdAt: -1 });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a customer
// @route   POST /api/customers
const createCustomer = async (req, res) => {
    const { name, phone, email } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ message: 'Name and phone are required' });
    }

    try {
        const exists = await Customer.findOne({ phone });
        if (exists) {
            return res.status(400).json({ message: 'Customer with this phone already exists' });
        }

        const customer = await Customer.create({ name, phone, email, user: req.user._id });
        res.status(201).json(customer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a customer
// @route   PUT /api/customers/:id
const updateCustomer = async (req, res) => {
    try {
        const query = { _id: req.params.id };
        if (req.user.role !== 'admin') query.user = req.user._id;
        
        const customer = await Customer.findOne(query);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found or unauthorized' });
        }

        const { name, phone, email } = req.body;
        customer.name = name || customer.name;
        customer.phone = phone || customer.phone;
        customer.email = email !== undefined ? email : customer.email;

        const updated = await customer.save();
        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a customer
// @route   DELETE /api/customers/:id
const deleteCustomer = async (req, res) => {
    try {
        const query = { _id: req.params.id };
        if (req.user.role !== 'admin') query.user = req.user._id;

        const customer = await Customer.findOneAndDelete(query);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found or unauthorized' });
        }
        res.json({ message: 'Customer removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getCustomers, createCustomer, updateCustomer, deleteCustomer };
