-- Drop existing tables if they exist (to avoid conflicts)
DROP TABLE IF EXISTS tickets, equipment, users CASCADE;

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('Helpdesk Operator', 'IT Technician', 'Office Manager')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Equipment Table
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(50) UNIQUE NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--create office table
CREATE TABLE office(
    id SERIAL PRIMARY KEY,
    office_name VARCHAR(100) NOT NULL,
    address VARCHAR(100) UNIQUE NOT NULL,
    contact VARCHAR(10) UNIQUE NOT NULL
);

-- User Office Relation
ALTER TABLE users ADD COLUMN office_id INT REFERENCES office(id) ON DELETE SET NULL;


-- Tickets Table
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    equipment_id INT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    issue_description TEXT NOT NULL,
    status VARCHAR(50) CHECK (status IN ('Open', 'In Progress', 'Closed')) DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tickets ADD COLUMN resolution_description TEXT;
