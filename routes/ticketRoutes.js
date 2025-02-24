const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // View All Tickets
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT tickets.*, users.name AS user_name, equipment.serial_number 
                FROM tickets 
                LEFT JOIN users ON tickets.user_id = users.id 
                LEFT JOIN equipment ON tickets.equipment_id = equipment.id 
                ORDER BY tickets.created_at DESC
            `);
            res.render('tickets', { tickets: result.rows, user: req.user });
        } catch (err) {
            console.error("Error fetching tickets:", err);
            res.redirect('/dashboard');
        }
    });

    // New Ticket Page (Helpdesk Operator only)
    router.get('/new', async (req, res) => {
        if (!req.isAuthenticated() || req.user.role !== 'Helpdesk Operator') {
            req.flash('error_msg', 'Not authorized');
            return res.redirect('/tickets');
        }

        try {
            // Fetch available equipment from the database
            const result = await pool.query('SELECT id, serial_number, make, model FROM equipment');
            
            // Debugging: Log retrieved equipment data
            console.log("Equipment Data:", result.rows);

            res.render('new_ticket', { user: req.user, equipment: result.rows });
        } catch (err) {
            console.error("Error fetching equipment:", err);
            req.flash('error_msg', 'Error fetching equipment.');
            res.redirect('/tickets');
        }
    });

    // Create New Ticket
    router.post('/new', async (req, res) => {
        if (!req.isAuthenticated() || req.user.role !== 'Helpdesk Operator') {
            req.flash('error_msg', 'Not authorized');
            return res.redirect('/tickets');
        }

        const { equipment_id, issue_description } = req.body;
        try {
            await pool.query(
                'INSERT INTO tickets (user_id, equipment_id, issue_description) VALUES ($1, $2, $3)', 
                [req.user.id, equipment_id, issue_description]
            );
            req.flash('success_msg', 'Ticket created successfully');
            res.redirect('/tickets');
        } catch (err) {
            console.error("Error creating ticket:", err);
            req.flash('error_msg', 'Error creating ticket.');
            res.redirect('/tickets/new');
        }
    });

    // Update Ticket Status (IT Technicians only)
    router.post('/update/:id', async (req, res) => {
        if (!req.isAuthenticated() || req.user.role !== 'IT Technician') {
            req.flash('error_msg', 'Not authorized');
            return res.redirect('/tickets');
        }

        const { status } = req.body;
        try {
            await pool.query('UPDATE tickets SET status = $1 WHERE id = $2', [status, req.params.id]);
            req.flash('success_msg', 'Ticket updated successfully');
            res.redirect('/tickets');
        } catch (err) {
            console.error("Error updating ticket:", err);
            req.flash('error_msg', 'Error updating ticket.');
            res.redirect('/tickets');
        }
    });

    // Delete Ticket (Office Manager only)
    router.post('/delete/:id', async (req, res) => {
        if (!req.isAuthenticated() || req.user.role !== 'Office Manager') {
            req.flash('error_msg', 'Not authorized');
            return res.redirect('/tickets');
        }

        try {
            await pool.query('DELETE FROM tickets WHERE id = $1', [req.params.id]);
            req.flash('success_msg', 'Ticket deleted successfully');
            res.redirect('/tickets');
        } catch (err) {
            console.error("Error deleting ticket:", err);
            req.flash('error_msg', 'Error deleting ticket.');
            res.redirect('/tickets');
        }
    });

    return router;
};
