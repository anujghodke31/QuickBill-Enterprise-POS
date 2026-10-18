const { z } = require('zod');

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['admin', 'cashier']).optional()
});

const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required')
});

module.exports = { registerSchema, loginSchema };
