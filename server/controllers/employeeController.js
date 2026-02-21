const User = require('../models/User');

// @desc    Get all employees (users)
// @route   GET /api/employees
const getEmployees = async (req, res) => {
  try {
    const employees = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new employee
// @route   POST /api/employees
const createEmployee = async (req, res) => {
  const { name, username, password, role } = req.body;

  try {
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const employee = await User.create({
      name,
      username,
      password, // In production, hash this!
      role: role || 'cashier',
    });

    res.status(201).json({
      _id: employee._id,
      name: employee.name,
      username: employee.username,
      role: employee.role,
      createdAt: employee.createdAt,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
const updateEmployee = async (req, res) => {
  const { name, username, password, role } = req.body;

  try {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check username uniqueness if changed
    if (username && username !== employee.username) {
      const existing = await User.findOne({ username });
      if (existing) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    employee.name = name || employee.name;
    employee.username = username || employee.username;
    employee.role = role || employee.role;
    if (password) {
      employee.password = password;
    }

    const updated = await employee.save();
    res.json({
      _id: updated._id,
      name: updated.name,
      username: updated.username,
      role: updated.role,
      createdAt: updated.createdAt,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
const deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Employee removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getEmployees, createEmployee, updateEmployee, deleteEmployee };
