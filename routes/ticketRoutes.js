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

            res.render('tickets', { tickets: result.rows, user: res.locals.user });
        } catch (err) {
            console.error("Error fetching tickets:", err);
            req.flash('error_msg', 'Error fetching tickets.');
            res.redirect('/dashboard');
        }
    });

    // New Ticket Page (Helpdesk Operator only)
    router.get('/new', async (req, res) => {
        if (!req.isAuthenticated() || !req.user || req.user.role !== 'Helpdesk Operator') {
            req.flash('error_msg', 'Not authorized');
            return res.redirect('/tickets');
        }

        try {
            const result = await pool.query('SELECT id, serial_number, make, model FROM equipment');
            res.render('new_ticket', { user: res.locals.user, equipment: result.rows });
        } catch (err) {
            console.error("Error fetching equipment:", err);
            req.flash('error_msg', 'Error fetching equipment.');
            res.redirect('/tickets');
        }
    });

    // Create New Ticket
    router.post('/new', async (req, res) => {
        if (!req.isAuthenticated() || !req.user || req.user.role !== 'Helpdesk Operator') {
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

    // Update Ticket Status and Resolution Description (IT Technicians only)
    router.post('/update/:id', async (req, res) => {
        if (!req.isAuthenticated() || !req.user || req.user.role !== 'IT Technician') {
            req.flash('error_msg', 'Not authorized');
            return res.redirect('/tickets');
        }

        const { status, resolution_description } = req.body;
        const ticketId = req.params.id;

        try {
            if (status === 'Closed' && (!resolution_description || resolution_description.trim() === '')) {
                req.flash('error_msg', 'Resolution description is required when closing a ticket.');
                return res.redirect('/tickets');
            }

            await pool.query(
                `UPDATE tickets 
                 SET status = $1::TEXT, 
                     resolution_description = $2, 
                     closed_at = CASE WHEN $1::TEXT = 'Closed' THEN NOW() ELSE closed_at END 
                 WHERE id = $3`,
                [status, resolution_description || null, ticketId]
            );

            req.flash('success_msg', 'Ticket updated successfully');
            res.redirect('/tickets');
        } catch (err) {
            console.error("Error updating ticket:", err);
            req.flash('error_msg', 'Error updating ticket.');
            res.redirect('/tickets');
        }
    });

    // View Reports (Office Manager only)
    router.get('/reports', async (req, res) => {
        if (!req.isAuthenticated() || req.user.role !== 'Office Manager') {
            req.flash('error_msg', 'Not authorized');
            return res.redirect('/dashboard');
        }
    
        try {
            // Fetch all tickets for the detailed report
           // Fetch all tickets for the detailed report
const detailedResult = await pool.query(
    `SELECT tickets.*, 
           users.name AS user_name, 
           equipment.serial_number,
           TO_CHAR(tickets.created_at, 'YYYY-MM-DD') AS start_date,
           TO_CHAR(tickets.closed_at, 'YYYY-MM-DD') AS closed_date
    FROM tickets
    LEFT JOIN users ON tickets.user_id = users.id
    LEFT JOIN equipment ON tickets.equipment_id = equipment.id
    ORDER BY tickets.created_at DESC`
);
            // Fetch summary report for each month
            const summaryResult = await pool.query(
                `SELECT 
                        TO_CHAR(created_at, 'YYYY-MM') AS month,
                        COUNT(*) AS total_tickets,
                        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) AS open_tickets,
                        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS closed_tickets,
                        AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600) AS avg_resolution_time
                FROM tickets
                WHERE status = 'Closed'
                GROUP BY month
                ORDER BY month DESC`
            );
    
            // Fetch technician summary
            const technicianSummaryResult = await pool.query(
                `SELECT
                     users.name AS technician_name,
                     COUNT(tickets.id) AS total_jobs,
                     COUNT(CASE WHEN tickets.status = 'Open' THEN 1 ELSE NULL END) AS open_cases,
                     COUNT(CASE WHEN tickets.status = 'Closed' THEN 1 ELSE NULL END) AS closed_cases,
                     ROUND(AVG(EXTRACT(EPOCH FROM (tickets.closed_at - tickets.created_at)) / 3600), 2) AS avg_hours_per_job
                 FROM users
                          LEFT JOIN assignments ON users.id = assignments.technician_id
                          LEFT JOIN tickets ON assignments.ticket_id = tickets.id
                 WHERE users.role = 'IT Technician'
                 GROUP BY users.id
                 ORDER BY total_jobs DESC NULLS LAST`
            );

    
            // Fetch office summary
            const officeSummaryResult = await pool.query(
                `SELECT
                     office.office_name AS office_name,
                     COUNT(tickets.id) FILTER (WHERE equipment.type = 'Hardware') AS hardware_faults,
                         COUNT(tickets.id) FILTER (WHERE equipment.type = 'Software') AS software_faults,
                         ROUND(SUM(EXTRACT(EPOCH FROM (tickets.closed_at - tickets.created_at))) / 3600, 2) AS total_hours_spent,
                     COUNT(DISTINCT assignments.technician_id) AS unique_technicians
                 FROM office
                          LEFT JOIN equipment ON office.id = equipment.office_id
                          LEFT JOIN tickets ON equipment.id = tickets.equipment_id
                          LEFT JOIN assignments ON tickets.id = assignments.ticket_id
                 GROUP BY office.id
                 ORDER BY total_hours_spent DESC NULLS LAST`
            );


            // Fetch equipment summary
            const equipmentSummaryResult = await pool.query(
                `SELECT equipment.serial_number, equipment.make, equipment.model, COUNT(*) AS total_jobs,
                        SUM(CASE WHEN tickets.status = 'Open' THEN 1 ELSE 0 END) AS open_cases,
                        SUM(CASE WHEN tickets.status = 'Closed' THEN 1 ELSE 0 END) AS closed_cases
                FROM tickets
                JOIN equipment ON tickets.equipment_id = equipment.id
                GROUP BY serial_number, make, model
                ORDER BY total_jobs DESC`
            );
    
            // Fetch technician-specific report
            const technicianSpecificResult = await pool.query(
                `SELECT
                     users.name AS technician_name,
                     offices.name AS office_name,
                     COALESCE(tickets.id, 0) AS job_number, -- Avoid invalid input
                     equipment.serial_number AS equipment,
                     COUNT(*) FILTER (WHERE tickets.status = 'Open') AS open_jobs,
                         COUNT(*) FILTER (WHERE tickets.status = 'Closed') AS closed_jobs,
                         SUM(EXTRACT(EPOCH FROM (tickets.closed_at - tickets.created_at))) / 3600 AS total_hours_spent,
                     AVG(EXTRACT(EPOCH FROM (tickets.closed_at - tickets.created_at)) / 3600) AS avg_hours_per_job
                 FROM tickets
                          RIGHT JOIN users ON tickets.user_id = users.id
                          LEFT JOIN equipment ON tickets.equipment_id = equipment.id
                          LEFT JOIN offices ON equipment.office_id = offices.id
                 WHERE users.role = 'IT Technician'
                 GROUP BY technician_name, office_name, job_number, equipment
                 ORDER BY total_hours_spent DESC;
                `
            );

            // Fetch office-specific report
            const officeSpecificResult = await pool.query(
                `SELECT office.office_name AS office_name,
                        COUNT(*) FILTER (WHERE tickets.status = 'Open') AS open_jobs,
                         COUNT(*) FILTER (WHERE tickets.status = 'Closed') AS closed_jobs,
                         COUNT(DISTINCT equipment.serial_number) AS jobs_per_register_item
                 FROM tickets
                          JOIN equipment ON tickets.equipment_id = equipment.id
                          JOIN office ON equipment.office_id = office.id
                 GROUP BY office.office_name
                 ORDER BY jobs_per_register_item DESC`
            );

    
            res.render('reports', {
                reports: detailedResult.rows,
                summary: summaryResult.rows,
                technicianSummary: technicianSummaryResult.rows,
                officeSummary: officeSummaryResult.rows,
                equipmentSummary: equipmentSummaryResult.rows,
                technicianSpecific: technicianSpecificResult.rows,
                officeSpecific: officeSpecificResult.rows,
                user: req.user
            });
        } catch (err) {
            console.error("Error fetching reports:", err);
            req.flash('error_msg', 'Error fetching reports.');
            res.redirect('/dashboard');
        }
    });
    
    // Delete Ticket (Office Manager only)
    router.post('/delete/:id', async (req, res) => {
        if (!req.isAuthenticated() || !req.user || req.user.role !== 'Office Manager') {
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
