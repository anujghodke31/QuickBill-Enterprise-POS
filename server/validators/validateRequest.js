const validateRequest = (schema) => async (req, res, next) => {
    try {
        await schema.parseAsync(req.body);
        next();
    } catch (error) {
        const formattedErrors = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }));
        
        return res.status(400).json({
            success: false,
            errors: formattedErrors
        });
    }
};

module.exports = { validateRequest };
