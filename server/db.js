const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'medtrack.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
function initDatabase() {
    // Users table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    // Pets table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS pets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            species TEXT NOT NULL,
            breed TEXT,
            age INTEGER,
            weight REAL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `).run();

    // Pet stools tracking
    db.prepare(`
        CREATE TABLE IF NOT EXISTS pet_stools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER NOT NULL,
            color TEXT,
            consistency TEXT,
            frequency INTEGER,
            notes TEXT,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
        )
    `).run();

    // Pet meals tracking
    db.prepare(`
        CREATE TABLE IF NOT EXISTS pet_meals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER NOT NULL,
            meal_type TEXT,
            food_name TEXT,
            amount REAL,
            unit TEXT,
            notes TEXT,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
        )
    `).run();

    // Pet vitals tracking
    db.prepare(`
        CREATE TABLE IF NOT EXISTS pet_vitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER NOT NULL,
            temperature REAL,
            heart_rate INTEGER,
            respiratory_rate INTEGER,
            weight REAL,
            blood_pressure TEXT,
            notes TEXT,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
        )
    `).run();

    // Pet activity tracking
    db.prepare(`
        CREATE TABLE IF NOT EXISTS pet_activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER NOT NULL,
            activity_type TEXT,
            duration INTEGER,
            intensity TEXT,
            notes TEXT,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
        )
    `).run();

    // Pet hydration tracking
    db.prepare(`
        CREATE TABLE IF NOT EXISTS pet_hydration (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER NOT NULL,
            amount REAL,
            unit TEXT,
            source TEXT,
            notes TEXT,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
        )
    `).run();

    // Pet medications tracking
    db.prepare(`
        CREATE TABLE IF NOT EXISTS pet_medications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER NOT NULL,
            medication_name TEXT NOT NULL,
            dosage TEXT,
            frequency TEXT,
            start_date DATE,
            end_date DATE,
            prescribed_by TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
        )
    `).run();

    // Babies table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS babies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            birth_date DATE NOT NULL,
            gender TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `).run();

    // Baby growth tracking
    db.prepare(`
        CREATE TABLE IF NOT EXISTS baby_growth (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            baby_id INTEGER NOT NULL,
            weight REAL,
            height REAL,
            head_circumference REAL,
            measurement_date DATE,
            notes TEXT,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE
        )
    `).run();

    // Baby feeding tracking
    db.prepare(`
        CREATE TABLE IF NOT EXISTS baby_feeding (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            baby_id INTEGER NOT NULL,
            feeding_type TEXT,
            amount REAL,
            unit TEXT,
            duration INTEGER,
            side TEXT,
            food_type TEXT,
            notes TEXT,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE
        )
    `).run();

    // Baby sleep tracking
    db.prepare(`
        CREATE TABLE IF NOT EXISTS baby_sleep (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            baby_id INTEGER NOT NULL,
            start_time DATETIME,
            end_time DATETIME,
            duration INTEGER,
            quality TEXT,
            location TEXT,
            notes TEXT,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE
        )
    `).run();

    // Baby diaper tracking
    db.prepare(`
        CREATE TABLE IF NOT EXISTS baby_diaper (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            baby_id INTEGER NOT NULL,
            diaper_type TEXT,
            color TEXT,
            consistency TEXT,
            rash_present BOOLEAN,
            notes TEXT,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE
        )
    `).run();

    // Baby milestones tracking
    db.prepare(`
        CREATE TABLE IF NOT EXISTS baby_milestones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            baby_id INTEGER NOT NULL,
            milestone_name TEXT NOT NULL,
            category TEXT,
            achieved_date DATE,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE
        )
    `).run();

    // Baby vaccinations tracking
    db.prepare(`
        CREATE TABLE IF NOT EXISTS baby_vaccinations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            baby_id INTEGER NOT NULL,
            vaccine_name TEXT NOT NULL,
            dose_number INTEGER,
            administration_date DATE,
            administered_by TEXT,
            batch_number TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE
        )
    `).run();

    // Baby temperature tracking
    db.prepare(`
        CREATE TABLE IF NOT EXISTS baby_temperature (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            baby_id INTEGER NOT NULL,
            temperature REAL NOT NULL,
            measurement_method TEXT,
            symptoms TEXT,
            medications_given TEXT,
            notes TEXT,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE
        )
    `).run();

    // Create indexes for better performance
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_babies_user_id ON babies(user_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pet_stools_pet_id ON pet_stools(pet_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pet_meals_pet_id ON pet_meals(pet_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pet_vitals_pet_id ON pet_vitals(pet_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pet_activity_pet_id ON pet_activity(pet_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pet_hydration_pet_id ON pet_hydration(pet_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pet_medications_pet_id ON pet_medications(pet_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_baby_growth_baby_id ON baby_growth(baby_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_baby_feeding_baby_id ON baby_feeding(baby_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_baby_sleep_baby_id ON baby_sleep(baby_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_baby_diaper_baby_id ON baby_diaper(baby_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_baby_milestones_baby_id ON baby_milestones(baby_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_baby_vaccinations_baby_id ON baby_vaccinations(baby_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_baby_temperature_baby_id ON baby_temperature(baby_id)').run();

    console.log('Database initialized successfully');
}

// Run initialization
initDatabase();

module.exports = db;
