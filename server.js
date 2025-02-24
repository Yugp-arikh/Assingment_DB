const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const { Pool } = require('pg');
const PORT = 5000;

// Single PostgreSQL Connection
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'helpdesk_system',
    password: 'yug232yug', // 
    port: 5432
});

const app = express();
require('./config/passportConfig.js')(passport, pool);

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

// Express Session
app.use(session({
    secret: 'superSecretKey',
    resave: false,
    saveUninitialized: false
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Global Flash Messages
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});


// Routes (Make sure authRoutes and ticketRoutes export functions if they use `pool`)
app.use('/', require('./routes/authRoutes')(pool));
app.use('/tickets', require('./routes/ticketRoutes')(pool));
app.get('/', (req, res) => {
    res.render('index');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
