const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./db');
const { authenticateToken, JWT_SECRET } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Initialize additional tables for charts, timelines, and DICOM
function initExtendedSchema() {
    // Chart data storage for analytics
    db.prepare(`
        CREATE TABLE IF NOT EXISTS pet_chart_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER NOT NULL,
            metric_type TEXT NOT NULL,
            metric_value REAL,
            chart_period TEXT,
            recorded_date DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS baby_chart_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            baby_id INTEGER NOT NULL,
            metric_type TEXT NOT NULL,
            metric_value REAL,
            chart_period TEXT,
            recorded_date DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE
        )
    `).run();

    // DICOM/medical imaging metadata
    db.prepare(`
        CREATE TABLE IF NOT EXISTS pet_dicom_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER NOT NULL,
            file_name TEXT,
            study_date DATE,
            study_description TEXT,
            modality TEXT,
            body_part TEXT,
            file_path TEXT,
            notes TEXT,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS baby_dicom_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            baby_id INTEGER NOT NULL,
            file_name TEXT,
            study_date DATE,
            study_description TEXT,
            modality TEXT,
            body_part TEXT,
            file_path TEXT,
            notes TEXT,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE
        )
    `).run();

    // Professional reports
    db.prepare(`
        CREATE TABLE IF NOT EXISTS pet_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER NOT NULL,
            report_type TEXT NOT NULL,
            start_date DATE,
            end_date DATE,
            summary TEXT,
            vet_recommendations TEXT,
            medications_review TEXT,
            diet_recommendations TEXT,
            activity_plan TEXT,
            generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS baby_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            baby_id INTEGER NOT NULL,
            report_type TEXT NOT NULL,
            start_date DATE,
            end_date DATE,
            summary TEXT,
            doctor_recommendations TEXT,
            nutrition_plan TEXT,
            developmental_notes TEXT,
            vaccination_status TEXT,
            growth_percentiles TEXT,
            generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE
        )
    `).run();

    // Timeline events
    db.prepare(`
        CREATE TABLE IF NOT EXISTS pet_timeline_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            event_date DATETIME,
            title TEXT,
            description TEXT,
            category TEXT,
            severity TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS baby_timeline_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            baby_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            event_date DATETIME,
            title TEXT,
            description TEXT,
            category TEXT,
            severity TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare('CREATE INDEX IF NOT EXISTS idx_pet_chart_pet_id ON pet_chart_data(pet_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_baby_chart_baby_id ON baby_chart_data(baby_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pet_dicom_pet_id ON pet_dicom_files(pet_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_baby_dicom_baby_id ON baby_dicom_files(baby_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pet_timeline_pet_id ON pet_timeline_events(pet_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_baby_timeline_baby_id ON baby_timeline_events(baby_id)').run();

    console.log('Extended schema initialized');
}

initExtendedSchema();

// ============================================================================
// AUTH ROUTES
// ============================================================================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = db.prepare(
            'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
        ).run(email, passwordHash, name);

        const token = jwt.sign(
            { userId: result.lastInsertRowid, email, name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: { id: result.lastInsertRowid, email, name }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req, res) => {
    try {
        const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user data' });
    }
});

// ============================================================================
// PET ROUTES
// ============================================================================

// GET /api/pets
app.get('/api/pets', authenticateToken, (req, res) => {
    try {
        const pets = db.prepare('SELECT * FROM pets WHERE user_id = ? ORDER BY created_at DESC').all(req.user.userId);
        res.json(pets);
    } catch (error) {
        console.error('Get pets error:', error);
        res.status(500).json({ error: 'Failed to get pets' });
    }
});

// POST /api/pets
app.post('/api/pets', authenticateToken, (req, res) => {
    try {
        const { name, species, breed, age, weight, notes } = req.body;
        
        if (!name || !species) {
            return res.status(400).json({ error: 'Name and species are required' });
        }

        const result = db.prepare(
            'INSERT INTO pets (user_id, name, species, breed, age, weight, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(req.user.userId, name, species, breed, age, weight, notes);

        const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(pet);
    } catch (error) {
        console.error('Create pet error:', error);
        res.status(500).json({ error: 'Failed to create pet' });
    }
});

// GET /api/pets/:id
app.get('/api/pets/:id', authenticateToken, (req, res) => {
    try {
        const pet = db.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
        if (!pet) {
            return res.status(404).json({ error: 'Pet not found' });
        }
        res.json(pet);
    } catch (error) {
        console.error('Get pet error:', error);
        res.status(500).json({ error: 'Failed to get pet' });
    }
});

// PUT /api/pets/:id
app.put('/api/pets/:id', authenticateToken, (req, res) => {
    try {
        const { name, species, breed, age, weight, notes } = req.body;
        
        const existingPet = db.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
        if (!existingPet) {
            return res.status(404).json({ error: 'Pet not found' });
        }

        db.prepare(
            'UPDATE pets SET name = ?, species = ?, breed = ?, age = ?, weight = ?, notes = ? WHERE id = ?'
        ).run(name, species, breed, age, weight, notes, req.params.id);

        const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(req.params.id);
        res.json(pet);
    } catch (error) {
        console.error('Update pet error:', error);
        res.status(500).json({ error: 'Failed to update pet' });
    }
});

// DELETE /api/pets/:id
app.delete('/api/pets/:id', authenticateToken, (req, res) => {
    try {
        const existingPet = db.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
        if (!existingPet) {
            return res.status(404).json({ error: 'Pet not found' });
        }

        db.prepare('DELETE FROM pets WHERE id = ?').run(req.params.id);
        res.json({ message: 'Pet deleted successfully' });
    } catch (error) {
        console.error('Delete pet error:', error);
        res.status(500).json({ error: 'Failed to delete pet' });
    }
});

// ============================================================================
// PET TRACKING ROUTES
// ============================================================================

function verifyPetOwnership(petId, userId) {
    const pet = db.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ?').get(petId, userId);
    return pet || null;
}

// Pet Stools
app.get('/api/pets/:petId/stools', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const records = db.prepare('SELECT * FROM pet_stools WHERE pet_id = ? ORDER BY recorded_at DESC').all(req.params.petId);
    res.json(records);
});

app.post('/api/pets/:petId/stools', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { color, consistency, frequency, notes } = req.body;
    const result = db.prepare(
        'INSERT INTO pet_stools (pet_id, color, consistency, frequency, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(req.params.petId, color, consistency, frequency, notes);
    const record = db.prepare('SELECT * FROM pet_stools WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
});

app.delete('/api/pets/:petId/stools/:id', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM pet_stools WHERE id = ? AND pet_id = ?').run(req.params.id, req.params.petId);
    res.json({ message: 'Record deleted' });
});

// Pet Meals
app.get('/api/pets/:petId/meals', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const records = db.prepare('SELECT * FROM pet_meals WHERE pet_id = ? ORDER BY recorded_at DESC').all(req.params.petId);
    res.json(records);
});

app.post('/api/pets/:petId/meals', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { meal_type, food_name, amount, unit, notes } = req.body;
    const result = db.prepare(
        'INSERT INTO pet_meals (pet_id, meal_type, food_name, amount, unit, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.params.petId, meal_type, food_name, amount, unit, notes);
    const record = db.prepare('SELECT * FROM pet_meals WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
});

app.delete('/api/pets/:petId/meals/:id', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM pet_meals WHERE id = ? AND pet_id = ?').run(req.params.id, req.params.petId);
    res.json({ message: 'Record deleted' });
});

// Pet Vitals
app.get('/api/pets/:petId/vitals', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const records = db.prepare('SELECT * FROM pet_vitals WHERE pet_id = ? ORDER BY recorded_at DESC').all(req.params.petId);
    res.json(records);
});

app.post('/api/pets/:petId/vitals', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { temperature, heart_rate, respiratory_rate, weight, blood_pressure, notes } = req.body;
    const result = db.prepare(
        'INSERT INTO pet_vitals (pet_id, temperature, heart_rate, respiratory_rate, weight, blood_pressure, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.params.petId, temperature, heart_rate, respiratory_rate, weight, blood_pressure, notes);
    const record = db.prepare('SELECT * FROM pet_vitals WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
});

app.delete('/api/pets/:petId/vitals/:id', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM pet_vitals WHERE id = ? AND pet_id = ?').run(req.params.id, req.params.petId);
    res.json({ message: 'Record deleted' });
});

// Pet Activity
app.get('/api/pets/:petId/activity', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const records = db.prepare('SELECT * FROM pet_activity WHERE pet_id = ? ORDER BY recorded_at DESC').all(req.params.petId);
    res.json(records);
});

app.post('/api/pets/:petId/activity', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { activity_type, duration, intensity, notes } = req.body;
    const result = db.prepare(
        'INSERT INTO pet_activity (pet_id, activity_type, duration, intensity, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(req.params.petId, activity_type, duration, intensity, notes);
    const record = db.prepare('SELECT * FROM pet_activity WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
});

app.delete('/api/pets/:petId/activity/:id', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM pet_activity WHERE id = ? AND pet_id = ?').run(req.params.id, req.params.petId);
    res.json({ message: 'Record deleted' });
});

// Pet Hydration
app.get('/api/pets/:petId/hydration', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const records = db.prepare('SELECT * FROM pet_hydration WHERE pet_id = ? ORDER BY recorded_at DESC').all(req.params.petId);
    res.json(records);
});

app.post('/api/pets/:petId/hydration', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { amount, unit, source, notes } = req.body;
    const result = db.prepare(
        'INSERT INTO pet_hydration (pet_id, amount, unit, source, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(req.params.petId, amount, unit, source, notes);
    const record = db.prepare('SELECT * FROM pet_hydration WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
});

app.delete('/api/pets/:petId/hydration/:id', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM pet_hydration WHERE id = ? AND pet_id = ?').run(req.params.id, req.params.petId);
    res.json({ message: 'Record deleted' });
});

// Pet Medications
app.get('/api/pets/:petId/medications', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const records = db.prepare('SELECT * FROM pet_medications WHERE pet_id = ? ORDER BY created_at DESC').all(req.params.petId);
    res.json(records);
});

app.post('/api/pets/:petId/medications', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { medication_name, dosage, frequency, start_date, end_date, prescribed_by, notes } = req.body;
    const result = db.prepare(
        'INSERT INTO pet_medications (pet_id, medication_name, dosage, frequency, start_date, end_date, prescribed_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.params.petId, medication_name, dosage, frequency, start_date, end_date, prescribed_by, notes);
    const record = db.prepare('SELECT * FROM pet_medications WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
});

app.delete('/api/pets/:petId/medications/:id', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM pet_medications WHERE id = ? AND pet_id = ?').run(req.params.id, req.params.petId);
    res.json({ message: 'Record deleted' });
});

// ============================================================================
// BABY ROUTES
// ============================================================================

// GET /api/babies
app.get('/api/babies', authenticateToken, (req, res) => {
    try {
        const babies = db.prepare('SELECT * FROM babies WHERE user_id = ? ORDER BY created_at DESC').all(req.user.userId);
        res.json(babies);
    } catch (error) {
        console.error('Get babies error:', error);
        res.status(500).json({ error: 'Failed to get babies' });
    }
});

// POST /api/babies
app.post('/api/babies', authenticateToken, (req, res) => {
    try {
        const { name, birth_date, gender, notes } = req.body;
        
        if (!name || !birth_date) {
            return res.status(400).json({ error: 'Name and birth_date are required' });
        }

        const result = db.prepare(
            'INSERT INTO babies (user_id, name, birth_date, gender, notes) VALUES (?, ?, ?, ?, ?)'
        ).run(req.user.userId, name, birth_date, gender, notes);

        const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(baby);
    } catch (error) {
        console.error('Create baby error:', error);
        res.status(500).json({ error: 'Failed to create baby' });
    }
});

// GET /api/babies/:id
app.get('/api/babies/:id', authenticateToken, (req, res) => {
    try {
        const baby = db.prepare('SELECT * FROM babies WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
        if (!baby) {
            return res.status(404).json({ error: 'Baby not found' });
        }
        res.json(baby);
    } catch (error) {
        console.error('Get baby error:', error);
        res.status(500).json({ error: 'Failed to get baby' });
    }
});

// PUT /api/babies/:id
app.put('/api/babies/:id', authenticateToken, (req, res) => {
    try {
        const { name, birth_date, gender, notes } = req.body;
        
        const existingBaby = db.prepare('SELECT * FROM babies WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
        if (!existingBaby) {
            return res.status(404).json({ error: 'Baby not found' });
        }

        db.prepare(
            'UPDATE babies SET name = ?, birth_date = ?, gender = ?, notes = ? WHERE id = ?'
        ).run(name, birth_date, gender, notes, req.params.id);

        const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(req.params.id);
        res.json(baby);
    } catch (error) {
        console.error('Update baby error:', error);
        res.status(500).json({ error: 'Failed to update baby' });
    }
});

// DELETE /api/babies/:id
app.delete('/api/babies/:id', authenticateToken, (req, res) => {
    try {
        const existingBaby = db.prepare('SELECT * FROM babies WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
        if (!existingBaby) {
            return res.status(404).json({ error: 'Baby not found' });
        }

        db.prepare('DELETE FROM babies WHERE id = ?').run(req.params.id);
        res.json({ message: 'Baby deleted successfully' });
    } catch (error) {
        console.error('Delete baby error:', error);
        res.status(500).json({ error: 'Failed to delete baby' });
    }
});

// ============================================================================
// BABY TRACKING ROUTES
// ============================================================================

function verifyBabyOwnership(babyId, userId) {
    const baby = db.prepare('SELECT * FROM babies WHERE id = ? AND user_id = ?').get(babyId, userId);
    return baby || null;
}

// Baby Growth
app.get('/api/babies/:babyId/growth', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const records = db.prepare('SELECT * FROM baby_growth WHERE baby_id = ? ORDER BY recorded_at DESC').all(req.params.babyId);
    res.json(records);
});

app.post('/api/babies/:babyId/growth', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { weight, height, head_circumference, measurement_date, notes } = req.body;
    const result = db.prepare(
        'INSERT INTO baby_growth (baby_id, weight, height, head_circumference, measurement_date, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.params.babyId, weight, height, head_circumference, measurement_date, notes);
    const record = db.prepare('SELECT * FROM baby_growth WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
});

app.delete('/api/babies/:babyId/growth/:id', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM baby_growth WHERE id = ? AND baby_id = ?').run(req.params.id, req.params.babyId);
    res.json({ message: 'Record deleted' });
});

// Baby Feeding
app.get('/api/babies/:babyId/feeding', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const records = db.prepare('SELECT * FROM baby_feeding WHERE baby_id = ? ORDER BY recorded_at DESC').all(req.params.babyId);
    res.json(records);
});

app.post('/api/babies/:babyId/feeding', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { feeding_type, amount, unit, duration, side, food_type, notes } = req.body;
    const result = db.prepare(
        'INSERT INTO baby_feeding (baby_id, feeding_type, amount, unit, duration, side, food_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.params.babyId, feeding_type, amount, unit, duration, side, food_type, notes);
    const record = db.prepare('SELECT * FROM baby_feeding WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
});

app.delete('/api/babies/:babyId/feeding/:id', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM baby_feeding WHERE id = ? AND baby_id = ?').run(req.params.id, req.params.babyId);
    res.json({ message: 'Record deleted' });
});

// Baby Sleep
app.get('/api/babies/:babyId/sleep', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const records = db.prepare('SELECT * FROM baby_sleep WHERE baby_id = ? ORDER BY recorded_at DESC').all(req.params.babyId);
    res.json(records);
});

app.post('/api/babies/:babyId/sleep', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { start_time, end_time, duration, quality, location, notes } = req.body;
    const result = db.prepare(
        'INSERT INTO baby_sleep (baby_id, start_time, end_time, duration, quality, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.params.babyId, start_time, end_time, duration, quality, location, notes);
    const record = db.prepare('SELECT * FROM baby_sleep WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
});

app.delete('/api/babies/:babyId/sleep/:id', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM baby_sleep WHERE id = ? AND baby_id = ?').run(req.params.id, req.params.babyId);
    res.json({ message: 'Record deleted' });
});

// Baby Diaper
app.get('/api/babies/:babyId/diapers', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const records = db.prepare('SELECT * FROM baby_diaper WHERE baby_id = ? ORDER BY recorded_at DESC').all(req.params.babyId);
    res.json(records);
});

app.post('/api/babies/:babyId/diapers', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { diaper_type, color, consistency, rash_present, notes } = req.body;
    const result = db.prepare(
        'INSERT INTO baby_diaper (baby_id, diaper_type, color, consistency, rash_present, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.params.babyId, diaper_type, color, consistency, rash_present, notes);
    const record = db.prepare('SELECT * FROM baby_diaper WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
});

app.delete('/api/babies/:babyId/diapers/:id', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM baby_diaper WHERE id = ? AND baby_id = ?').run(req.params.id, req.params.babyId);
    res.json({ message: 'Record deleted' });
});

// Baby Milestones
app.get('/api/babies/:babyId/milestones', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const records = db.prepare('SELECT * FROM baby_milestones WHERE baby_id = ? ORDER BY created_at DESC').all(req.params.babyId);
    res.json(records);
});

app.post('/api/babies/:babyId/milestones', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { milestone_name, category, achieved_date, notes } = req.body;
    const result = db.prepare(
        'INSERT INTO baby_milestones (baby_id, milestone_name, category, achieved_date, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(req.params.babyId, milestone_name, category, achieved_date, notes);
    const record = db.prepare('SELECT * FROM baby_milestones WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
});

app.delete('/api/babies/:babyId/milestones/:id', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM baby_milestones WHERE id = ? AND baby_id = ?').run(req.params.id, req.params.babyId);
    res.json({ message: 'Record deleted' });
});

// Baby Vaccinations
app.get('/api/babies/:babyId/vaccinations', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const records = db.prepare('SELECT * FROM baby_vaccinations WHERE baby_id = ? ORDER BY created_at DESC').all(req.params.babyId);
    res.json(records);
});

app.post('/api/babies/:babyId/vaccinations', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { vaccine_name, dose_number, administration_date, administered_by, batch_number, notes } = req.body;
    const result = db.prepare(
        'INSERT INTO baby_vaccinations (baby_id, vaccine_name, dose_number, administration_date, administered_by, batch_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.params.babyId, vaccine_name, dose_number, administration_date, administered_by, batch_number, notes);
    const record = db.prepare('SELECT * FROM baby_vaccinations WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
});

app.delete('/api/babies/:babyId/vaccinations/:id', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM baby_vaccinations WHERE id = ? AND baby_id = ?').run(req.params.id, req.params.babyId);
    res.json({ message: 'Record deleted' });
});

// Baby Temperature
app.get('/api/babies/:babyId/temperature', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const records = db.prepare('SELECT * FROM baby_temperature WHERE baby_id = ? ORDER BY recorded_at DESC').all(req.params.babyId);
    res.json(records);
});

app.post('/api/babies/:babyId/temperature', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { temperature, measurement_method, symptoms, medications_given, notes } = req.body;
    const result = db.prepare(
        'INSERT INTO baby_temperature (baby_id, temperature, measurement_method, symptoms, medications_given, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.params.babyId, temperature, measurement_method, symptoms, medications_given, notes);
    const record = db.prepare('SELECT * FROM baby_temperature WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
});

app.delete('/api/babies/:babyId/temperature/:id', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM baby_temperature WHERE id = ? AND baby_id = ?').run(req.params.id, req.params.babyId);
    res.json({ message: 'Record deleted' });
});

// ============================================================================
// TIMELINE ROUTES
// ============================================================================

// Pet Timeline
app.get('/api/pets/:petId/timeline', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const events = db.prepare('SELECT * FROM pet_timeline_events WHERE pet_id = ? ORDER BY event_date DESC').all(req.params.petId);
    res.json(events);
});

app.post('/api/pets/:petId/timeline', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { event_type, event_date, title, description, category, severity } = req.body;
    const result = db.prepare(
        'INSERT INTO pet_timeline_events (pet_id, event_type, event_date, title, description, category, severity) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.params.petId, event_type, event_date, title, description, category, severity);
    const event = db.prepare('SELECT * FROM pet_timeline_events WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(event);
});

// Baby Timeline
app.get('/api/babies/:babyId/timeline', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const events = db.prepare('SELECT * FROM baby_timeline_events WHERE baby_id = ? ORDER BY event_date DESC').all(req.params.babyId);
    res.json(events);
});

app.post('/api/babies/:babyId/timeline', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { event_type, event_date, title, description, category, severity } = req.body;
    const result = db.prepare(
        'INSERT INTO baby_timeline_events (baby_id, event_type, event_date, title, description, category, severity) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.params.babyId, event_type, event_date, title, description, category, severity);
    const event = db.prepare('SELECT * FROM baby_timeline_events WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(event);
});

// ============================================================================
// CHART DATA ROUTES
// ============================================================================

// Pet Charts
app.get('/api/pets/:petId/charts/:metricType', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { days = 30 } = req.query;
    const data = db.prepare(
        `SELECT * FROM pet_chart_data WHERE pet_id = ? AND metric_type = ? 
         AND recorded_date >= date('now', ?) ORDER BY recorded_date ASC`
    ).all(req.params.petId, req.params.metricType, `-${days} days`);
    res.json(data);
});

app.post('/api/pets/:petId/charts', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { metric_type, metric_value, chart_period, recorded_date } = req.body;
    const result = db.prepare(
        'INSERT INTO pet_chart_data (pet_id, metric_type, metric_value, chart_period, recorded_date) VALUES (?, ?, ?, ?, ?)'
    ).run(req.params.petId, metric_type, metric_value, chart_period, recorded_date);
    const data = db.prepare('SELECT * FROM pet_chart_data WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(data);
});

// Baby Charts
app.get('/api/babies/:babyId/charts/:metricType', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { days = 365 } = req.query;
    const data = db.prepare(
        `SELECT * FROM baby_chart_data WHERE baby_id = ? AND metric_type = ? 
         AND recorded_date >= date('now', ?) ORDER BY recorded_date ASC`
    ).all(req.params.babyId, req.params.metricType, `-${days} days`);
    res.json(data);
});

app.post('/api/babies/:babyId/charts', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { metric_type, metric_value, chart_period, recorded_date } = req.body;
    const result = db.prepare(
        'INSERT INTO baby_chart_data (baby_id, metric_type, metric_value, chart_period, recorded_date) VALUES (?, ?, ?, ?, ?)'
    ).run(req.params.babyId, metric_type, metric_value, chart_period, recorded_date);
    const data = db.prepare('SELECT * FROM baby_chart_data WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(data);
});

// ============================================================================
// DICOM ROUTES
// ============================================================================

// Pet DICOM
app.get('/api/pets/:petId/dicom', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const files = db.prepare('SELECT * FROM pet_dicom_files WHERE pet_id = ? ORDER BY study_date DESC').all(req.params.petId);
    res.json(files);
});

app.post('/api/pets/:petId/dicom', authenticateToken, (req, res) => {
    if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { file_name, study_date, study_description, modality, body_part, file_path, notes } = req.body;
    const result = db.prepare(
        'INSERT INTO pet_dicom_files (pet_id, file_name, study_date, study_description, modality, body_part, file_path, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.params.petId, file_name, study_date, study_description, modality, body_part, file_path, notes);
    const file = db.prepare('SELECT * FROM pet_dicom_files WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(file);
});

// Baby DICOM
app.get('/api/babies/:babyId/dicom', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const files = db.prepare('SELECT * FROM baby_dicom_files WHERE baby_id = ? ORDER BY study_date DESC').all(req.params.babyId);
    res.json(files);
});

app.post('/api/babies/:babyId/dicom', authenticateToken, (req, res) => {
    if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { file_name, study_date, study_description, modality, body_part, file_path, notes } = req.body;
    const result = db.prepare(
        'INSERT INTO baby_dicom_files (baby_id, file_name, study_date, study_description, modality, body_part, file_path, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.params.babyId, file_name, study_date, study_description, modality, body_part, file_path, notes);
    const file = db.prepare('SELECT * FROM baby_dicom_files WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(file);
});

// ============================================================================
// COMPREHENSIVE REPORTS
// ============================================================================

// Generate Pet Report
app.get('/api/pets/:petId/report', authenticateToken, (req, res) => {
    try {
        if (!verifyPetOwnership(req.params.petId, req.user.userId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const { days = 30 } = req.query;
        const petId = req.params.petId;
        
        const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(petId);
        
        // Get all tracking data for the period
        const vitals = db.prepare(
            "SELECT * FROM pet_vitals WHERE pet_id = ? AND recorded_at >= datetime('now', ?) ORDER BY recorded_at DESC"
        ).all(petId, `-${days} days`);
        
        const meals = db.prepare(
            "SELECT * FROM pet_meals WHERE pet_id = ? AND recorded_at >= datetime('now', ?) ORDER BY recorded_at DESC"
        ).all(petId, `-${days} days`);
        
        const stools = db.prepare(
            "SELECT * FROM pet_stools WHERE pet_id = ? AND recorded_at >= datetime('now', ?) ORDER BY recorded_at DESC"
        ).all(petId, `-${days} days`);
        
        const activity = db.prepare(
            "SELECT * FROM pet_activity WHERE pet_id = ? AND recorded_at >= datetime('now', ?) ORDER BY recorded_at DESC"
        ).all(petId, `-${days} days`);
        
        const hydration = db.prepare(
            "SELECT * FROM pet_hydration WHERE pet_id = ? AND recorded_at >= datetime('now', ?) ORDER BY recorded_at DESC"
        ).all(petId, `-${days} days`);
        
        const medications = db.prepare(
            "SELECT * FROM pet_medications WHERE pet_id = ? AND (end_date IS NULL OR end_date >= date('now', ?)) ORDER BY created_at DESC"
        ).all(petId, `-${days} days`);
        
        const timeline = db.prepare(
            "SELECT * FROM pet_timeline_events WHERE pet_id = ? AND event_date >= datetime('now', ?) ORDER BY event_date DESC"
        ).all(petId, `-${days} days`);
        
        // Calculate statistics
        const weightTrend = vitals.length > 0 ? vitals.map(v => ({ date: v.recorded_at, weight: v.weight })) : [];
        const avgTemp = vitals.filter(v => v.temperature).length > 0 
            ? (vitals.filter(v => v.temperature).reduce((sum, v) => sum + v.temperature, 0) / vitals.filter(v => v.temperature).length).toFixed(1)
            : null;
        
        const report = {
            pet,
            period: `${days} days`,
            generated_at: new Date().toISOString(),
            summary: {
                total_vitals_recorded: vitals.length,
                total_meals_recorded: meals.length,
                total_stools_recorded: stools.length,
                total_activity_sessions: activity.length,
                total_hydration_entries: hydration.length,
                active_medications: medications.filter(m => !m.end_date || new Date(m.end_date) >= new Date()).length
            },
            weight_trend: weightTrend,
            average_temperature: avgTemp,
            recent_vitals: vitals.slice(0, 10),
            recent_meals: meals.slice(0, 10),
            recent_stools: stools.slice(0, 10),
            recent_activity: activity.slice(0, 10),
            recent_hydration: hydration.slice(0, 10),
            medications,
            timeline_events: timeline,
            recommendations: generatePetRecommendations({ vitals, meals, activity, medications })
        };
        
        res.json(report);
    } catch (error) {
        console.error('Generate pet report error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

function generatePetRecommendations(data) {
    const recommendations = [];
    
    if (data.vitals.length === 0) {
        recommendations.push({ type: 'warning', text: 'No vital signs recorded recently. Regular monitoring is recommended.' });
    }
    
    if (data.meals.length < 7) {
        recommendations.push({ type: 'info', text: 'Consider recording daily meals to better track nutrition.' });
    }
    
    if (data.activity.length < 3) {
        recommendations.push({ type: 'info', text: 'Add activity tracking to monitor exercise levels.' });
    }
    
    if (data.medications.length > 0) {
        const activeMeds = data.medications.filter(m => !m.end_date || new Date(m.end_date) >= new Date());
        if (activeMeds.length > 0) {
            recommendations.push({ type: 'reminder', text: `Pet has ${activeMeds.length} active medication(s). Ensure adherence to schedule.` });
        }
    }
    
    return recommendations;
}

// Generate Baby Report
app.get('/api/babies/:babyId/report', authenticateToken, (req, res) => {
    try {
        if (!verifyBabyOwnership(req.params.babyId, req.user.userId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const { days = 30 } = req.query;
        const babyId = req.params.babyId;
        
        const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(babyId);
        
        // Calculate baby's age
        const birthDate = new Date(baby.birth_date);
        const now = new Date();
        const ageMonths = Math.floor((now - birthDate) / (1000 * 60 * 60 * 24 * 30));
        
        // Get all tracking data
        const growth = db.prepare(
            "SELECT * FROM baby_growth WHERE baby_id = ? ORDER BY measurement_date DESC"
        ).all(babyId);
        
        const feeding = db.prepare(
            "SELECT * FROM baby_feeding WHERE baby_id = ? AND recorded_at >= datetime('now', ?) ORDER BY recorded_at DESC"
        ).all(babyId, `-${days} days`);
        
        const sleep = db.prepare(
            "SELECT * FROM baby_sleep WHERE baby_id = ? AND recorded_at >= datetime('now', ?) ORDER BY recorded_at DESC"
        ).all(babyId, `-${days} days`);
        
        const diapers = db.prepare(
            "SELECT * FROM baby_diaper WHERE baby_id = ? AND recorded_at >= datetime('now', ?) ORDER BY recorded_at DESC"
        ).all(babyId, `-${days} days`);
        
        const temperature = db.prepare(
            "SELECT * FROM baby_temperature WHERE baby_id = ? AND recorded_at >= datetime('now', ?) ORDER BY recorded_at DESC"
        ).all(babyId, `-${days} days`);
        
        const milestones = db.prepare(
            "SELECT * FROM baby_milestones WHERE baby_id = ? ORDER BY achieved_date DESC"
        ).all(babyId);
        
        const vaccinations = db.prepare(
            "SELECT * FROM baby_vaccinations WHERE baby_id = ? ORDER BY administration_date DESC"
        ).all(babyId);
        
        const timeline = db.prepare(
            "SELECT * FROM baby_timeline_events WHERE baby_id = ? AND event_date >= datetime('now', ?) ORDER BY event_date DESC"
        ).all(babyId, `-${days} days`);
        
        // Calculate sleep statistics
        const totalSleepMinutes = sleep.reduce((sum, s) => sum + (s.duration || 0), 0);
        const avgSleepPerDay = (totalSleepMinutes / days).toFixed(1);
        
        // Feeding stats
        const feedingCount = feeding.length;
        const avgFeedingsPerDay = (feedingCount / days).toFixed(1);
        
        // Diaper stats
        const wetDiapers = diapers.filter(d => d.diaper_type === 'wet' || d.diaper_type === 'both').length;
        const dirtyDiapers = diapers.filter(d => d.diaper_type === 'dirty' || d.diaper_type === 'both').length;
        
        // Growth percentiles (simplified calculation)
        const latestGrowth = growth[0] || null;
        
        const report = {
            baby: { ...baby, age_months: ageMonths },
            period: `${days} days`,
            generated_at: new Date().toISOString(),
            summary: {
                age_months: ageMonths,
                total_feedings: feedingCount,
                total_sleep_entries: sleep.length,
                total_diaper_changes: diapers.length,
                wet_diapers: wetDiapers,
                dirty_diapers: dirtyDiapers,
                temperature_readings: temperature.length,
                milestones_achieved: milestones.length,
                vaccinations_received: vaccinations.length
            },
            growth_data: growth,
            latest_measurements: latestGrowth,
            sleep_average_minutes_per_day: avgSleepPerDay,
            feedings_average_per_day: avgFeedingsPerDay,
            recent_feeding: feeding.slice(0, 10),
            recent_sleep: sleep.slice(0, 10),
            recent_diapers: diapers.slice(0, 10),
            recent_temperature: temperature.slice(0, 10),
            milestones,
            vaccinations,
            timeline_events: timeline,
            recommendations: generateBabyRecommendations({ ageMonths, growth, feeding, sleep, diapers, temperature, milestones })
        };
        
        res.json(report);
    } catch (error) {
        console.error('Generate baby report error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

function generateBabyRecommendations(data) {
    const recommendations = [];
    
    if (data.ageMonths < 6 && data.feeding.length < data.ageMonths * 4) {
        recommendations.push({ type: 'info', text: 'Newborns typically feed 8-12 times per day. Track feedings for better insight.' });
    }
    
    if (data.sleep.length < 7) {
        recommendations.push({ type: 'info', text: 'Track sleep patterns to help establish healthy sleep routines.' });
    }
    
    if (data.temperature.some(t => t.temperature > 38)) {
        recommendations.push({ type: 'alert', text: 'Elevated temperature detected. Consult healthcare provider if persists.' });
    }
    
    if (data.diapers.length < 4 * data.ageMonths) {
        recommendations.push({ type: 'info', text: 'Typical newborns have 6+ wet diapers daily. Track for hydration monitoring.' });
    }
    
    if (data.milestones.length === 0 && data.ageMonths > 3) {
        recommendations.push({ type: 'info', text: 'Start tracking developmental milestones. First smiles typically appear around 6-8 weeks.' });
    }
    
    return recommendations;
}

// ============================================================================
// CATCH-ALL FOR SPA
// ============================================================================

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`MedTrack Pro server running on port ${PORT}`);
});

module.exports = app;
