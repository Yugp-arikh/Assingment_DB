CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    office_id INTEGER
);

CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    equipment_id INTEGER,
    issue_description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_description TEXT,
    closed_at TIMESTAMP,
    CHECK (status IN ('Open', 'In Progress', 'Closed'))
);

CREATE TABLE offices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    specialization VARCHAR(100) NOT NULL
);

CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER,
    technician_id INTEGER,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    office_id INTEGER,
    CONSTRAINT users_role_check CHECK (
        role IN ('Helpdesk Operator', 'IT Technician', 'Office Manager', 'Other')
    )
);

