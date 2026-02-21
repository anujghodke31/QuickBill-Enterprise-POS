const Supplier = require('../models/Supplier');

// @desc    Get all suppliers
// @route   GET /api/suppliers
const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({}).sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a supplier
// @route   POST /api/suppliers
const createSupplier = async (req, res) => {
  const { name, phone, email, company, address } = req.body;

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
    });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a supplier
// @route   PUT /api/suppliers/:id
const updateSupplier = async (req, res) => {
  const { name, phone, email, company, address } = req.body;

  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    supplier.name = name || supplier.name;
    supplier.phone = phone !== undefined ? phone : supplier.phone;
    supplier.email = email !== undefined ? email : supplier.email;
    supplier.company = company !== undefined ? company : supplier.company;
    supplier.address = address !== undefined ? address : supplier.address;

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
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
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
