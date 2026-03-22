const Supplier = require('../models/Supplier');

// @desc    Get all suppliers
// @route   GET /api/suppliers
const getSuppliers = async (req, res) => {
    try {
        const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
        const suppliers = await Supplier.find(filter).sort({ createdAt: -1 });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a supplier
// @route   POST /api/suppliers
const createSupplier = async (req, res) => {
    const { name, phone, email, company, address, gstNumber, category, status } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Supplier name is required' });
    }

    try {
        const supplier = await Supplier.create({
            name,
            phone: phone || '',
            email: email || '',
            company: company || '',
            address: address || '',
            gstNumber: gstNumber || '',
            category: category || 'General',
            status: status || 'active',
            user: req.user._id,
        });
        res.status(201).json(supplier);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a supplier
// @route   PUT /api/suppliers/:id
const updateSupplier = async (req, res) => {
    const { name, phone, email, company, address, gstNumber, category, status } = req.body;

    try {
        const query = { _id: req.params.id };
        if (req.user.role !== 'admin') query.user = req.user._id;

        const supplier = await Supplier.findOne(query);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found or unauthorized' });
        }

        supplier.name = name || supplier.name;
        supplier.phone = phone !== undefined ? phone : supplier.phone;
        supplier.email = email !== undefined ? email : supplier.email;
        supplier.company = company !== undefined ? company : supplier.company;
        supplier.address = address !== undefined ? address : supplier.address;
        supplier.gstNumber = gstNumber !== undefined ? gstNumber : supplier.gstNumber;
        supplier.category = category || supplier.category;
        supplier.status = status || supplier.status;

        const updatedSupplier = await supplier.save();
        res.json(updatedSupplier);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a supplier
// @route   DELETE /api/suppliers/:id
const deleteSupplier = async (req, res) => {
    try {
        const query = { _id: req.params.id };
        if (req.user.role !== 'admin') query.user = req.user._id;

        const supplier = await Supplier.findOneAndDelete(query);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found or unauthorized' });
        }

        res.json({ message: 'Supplier removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
};
