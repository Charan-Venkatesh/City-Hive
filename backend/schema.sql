CREATE TABLE users (
	id SERIAL NOT NULL,
	email VARCHAR(254) NOT NULL,
	password_hash VARCHAR(256) NOT NULL,
	role VARCHAR(16) NOT NULL,
	must_change_password BOOLEAN NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (email)
);

CREATE TABLE branches (
	id SERIAL NOT NULL,
	name VARCHAR(100) NOT NULL,
	address VARCHAR(300) NOT NULL,
	contact_phone VARCHAR(30) NOT NULL,
	description TEXT NOT NULL,
	rules TEXT NOT NULL,
	active BOOLEAN NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (name)
);

CREATE TABLE outbox (
	id SERIAL NOT NULL,
	dedupe_key VARCHAR(120) NOT NULL,
	recipient VARCHAR(254) NOT NULL,
	subject VARCHAR(200) NOT NULL,
	body TEXT NOT NULL,
	sent_at TIMESTAMP WITH TIME ZONE,
	cancelled BOOLEAN NOT NULL,
	attempts INTEGER NOT NULL,
	last_error VARCHAR(100) NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (dedupe_key)
);

CREATE TABLE rooms (
	id SERIAL NOT NULL,
	branch_id INTEGER,
	number VARCHAR(30) NOT NULL,
	floor VARCHAR(30) NOT NULL,
	capacity INTEGER NOT NULL,
	monthly_fee NUMERIC(12, 2) NOT NULL,
	PRIMARY KEY (id),
	CHECK (capacity BETWEEN 1 AND 8),
	CHECK (monthly_fee >= 0),
	FOREIGN KEY(branch_id) REFERENCES branches (id),
	UNIQUE (number)
);

CREATE INDEX ix_rooms_branch_id ON rooms (branch_id);

CREATE TABLE residents (
	id SERIAL NOT NULL,
	branch_id INTEGER,
	user_id INTEGER NOT NULL,
	name VARCHAR(100) NOT NULL,
	phone VARCHAR(15) NOT NULL,
	guardian VARCHAR(100) NOT NULL,
	guardian_phone VARCHAR(15) NOT NULL,
	institution VARCHAR(150) NOT NULL,
	joined_on DATE NOT NULL,
	room_id INTEGER,
	discount NUMERIC(12, 2) NOT NULL,
	aadhaar_last4 VARCHAR(4),
	id_status VARCHAR(20) NOT NULL,
	id_reviewed_by INTEGER,
	id_reviewed_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (id),
	CHECK (discount >= 0),
	FOREIGN KEY(branch_id) REFERENCES branches (id),
	UNIQUE (user_id),
	FOREIGN KEY(user_id) REFERENCES users (id),
	FOREIGN KEY(room_id) REFERENCES rooms (id),
	FOREIGN KEY(id_reviewed_by) REFERENCES users (id)
);

CREATE INDEX ix_residents_branch_id ON residents (branch_id);

CREATE TABLE invoices (
	id SERIAL NOT NULL,
	resident_id INTEGER NOT NULL,
	month DATE NOT NULL,
	due_on DATE NOT NULL,
	room_number VARCHAR(30) NOT NULL,
	base_fee NUMERIC(12, 2) NOT NULL,
	discount NUMERIC(12, 2) NOT NULL,
	amount NUMERIC(12, 2) NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (resident_id, month),
	CHECK (amount >= 0),
	FOREIGN KEY(resident_id) REFERENCES residents (id)
);

CREATE TABLE complaints (
	id SERIAL NOT NULL,
	resident_id INTEGER NOT NULL,
	category VARCHAR(30) NOT NULL,
	title VARCHAR(150) NOT NULL,
	description TEXT NOT NULL,
	status VARCHAR(20) NOT NULL,
	response TEXT NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(resident_id) REFERENCES residents (id)
);

CREATE TABLE payments (
	id SERIAL NOT NULL,
	invoice_id INTEGER NOT NULL,
	amount NUMERIC(12, 2) NOT NULL,
	method VARCHAR(20) NOT NULL,
	reference VARCHAR(100) NOT NULL,
	idempotency_key VARCHAR(64) NOT NULL,
	recorded_by INTEGER NOT NULL,
	paid_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	CHECK (amount > 0),
	FOREIGN KEY(invoice_id) REFERENCES invoices (id),
	UNIQUE (idempotency_key),
	FOREIGN KEY(recorded_by) REFERENCES users (id)
);
