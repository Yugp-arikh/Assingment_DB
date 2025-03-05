const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');

module.exports = (pool) => {
    // Login Page
    router.get('/login', (req, res) => res.render('login'));

    // Register Page
    router.get('/register', async (req, res) => {
        const offices = await pool.query('SELECT * FROM office'); // Fetch office list for registration
        res.render('register', { errors: [], offices: offices.rows });
    });
    

    // Register User
    router.post('/register', async (req, res) => {
        const { name, email, password, password2, role, office_id } = req.body;
        let errors = [];

        if (password !== password2) errors.push({ msg: "Passwords do not match" });

        if (errors.length > 0) {
            const offices = await pool.query('SELECT * FROM office');
            return res.render('register', { errors, name, email, role, offices: offices.rows });
        }

        try {
            const hash = await bcrypt.hash(password, 10);
            await pool.query(
                'INSERT INTO users (name, email, password, role, office_id) VALUES ($1, $2, $3, $4, $5)',
                [name, email, hash, role, office_id || null]
            );
            req.flash('success_msg', 'You are registered and can log in');
            res.redirect('/login');
        } catch (err) {
            console.error(err);
            res.redirect('/register');
        }
    });

    // Login Handle
    router.post('/login', passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/login',
        failureFlash: true
    }));

    // Dashboard Route
    router.get('/dashboard', async (req, res) => {
        if (!req.isAuthenticated()) return res.redirect('/login');

        try {
            const result = await pool.query(
                `SELECT users.*, office.office_name, office.address, office.contact 
                FROM users 
                LEFT JOIN office ON users.office_id = office.id 
                WHERE users.id = $1`,
                [req.user.id]
            );

            const userWithOffice = result.rows[0];

            res.render('dashboard', { user: userWithOffice });
        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'Error fetching dashboard data');
            res.redirect('/login');
        }
    });

    // Logout Handle
    router.get('/logout', (req, res) => {
        req.logout(() => {
            req.flash('success_msg', 'You are logged out');
            res.redirect('/login');
        });
    });

    return router;
};
