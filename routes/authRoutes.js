const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');

module.exports = (pool) => {
    // Login Page
    router.get('/login', (req, res) => res.render('login'));

    // Register Page
    router.get('/register', (req, res) => res.render('register'));

    // Register User
    router.post('/register', async (req, res) => {
        const { name, email, password, password2, role } = req.body;
        let errors = [];

        if (password !== password2) errors.push({ msg: "Passwords do not match" });

        if (errors.length > 0) return res.render('register', { errors, name, email, role });

        try {
            const hash = await bcrypt.hash(password, 10);
            await pool.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [name, email, hash, role]);
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

    // Dashboard
    router.get('/dashboard', (req, res) => {
        if (!req.isAuthenticated()) return res.redirect('/login');
        res.render('dashboard', { user: req.user });
    });

    // Logout Handle
    router.get('/logout', (req, res) => {
        req.logout(() => {
            req.flash('success_msg', 'You are logged out');
            res.redirect('/login');
        });
    });

    router.get('/dashboard', (req, res) => {
        if (!req.isAuthenticated()) return res.redirect('/login');
        res.render('dashboard', { user: req.user });
    });
    

    return router;
};
