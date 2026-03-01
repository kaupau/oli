package repositories

import (
	"database/sql"
	"strudelvibe/internal/models"
	"time"
)

type Repository struct {
	db *sql.DB
}

func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) InitSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS sound_banks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		description TEXT,
		is_default INTEGER DEFAULT 0,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS sound_files (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		sound_bank_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		filename TEXT NOT NULL,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (sound_bank_id) REFERENCES sound_banks(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS projects (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		code TEXT,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP,
		updated_at TEXT DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := r.db.Exec(schema)
	return err
}

func (r *Repository) ListSoundBanks() ([]models.SoundBank, error) {
	rows, err := r.db.Query("SELECT id, name, description, is_default, created_at FROM sound_banks ORDER BY is_default DESC, created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var banks []models.SoundBank
	for rows.Next() {
		var b models.SoundBank
		if err := rows.Scan(&b.ID, &b.Name, &b.Description, &b.IsDefault, &b.CreatedAt); err != nil {
			return nil, err
		}
		banks = append(banks, b)
	}
	return banks, nil
}

func (r *Repository) CreateSoundBank(name, description string, isDefault bool) (*models.SoundBank, error) {
	now := time.Now().Format(time.RFC3339)
	result, err := r.db.Exec(
		"INSERT INTO sound_banks (name, description, is_default, created_at) VALUES (?, ?, ?, ?)",
		name, description, isDefault, now,
	)
	if err != nil {
		return nil, err
	}

	id, _ := result.LastInsertId()
	return &models.SoundBank{
		ID:          id,
		Name:        name,
		Description: description,
		IsDefault:   isDefault,
		CreatedAt:   now,
	}, nil
}

func (r *Repository) HasDefaultBanks() (bool, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM sound_banks WHERE is_default = 1").Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *Repository) DeleteSoundBank(id int64) error {
	_, err := r.db.Exec("DELETE FROM sound_banks WHERE id = ? AND is_default = 0", id)
	return err
}

func (r *Repository) GetSoundBankFiles(bankID int64) ([]models.SoundFile, error) {
	rows, err := r.db.Query(
		"SELECT id, sound_bank_id, name, filename, created_at FROM sound_files WHERE sound_bank_id = ?",
		bankID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.SoundFile
	for rows.Next() {
		var f models.SoundFile
		if err := rows.Scan(&f.ID, &f.SoundBankID, &f.Name, &f.Filename, &f.CreatedAt); err != nil {
			return nil, err
		}
		files = append(files, f)
	}
	return files, nil
}

func (r *Repository) AddSoundFile(bankID int64, name, filename string) (*models.SoundFile, error) {
	now := time.Now().Format(time.RFC3339)
	result, err := r.db.Exec(
		"INSERT INTO sound_files (sound_bank_id, name, filename, created_at) VALUES (?, ?, ?, ?)",
		bankID, name, filename, now,
	)
	if err != nil {
		return nil, err
	}

	id, _ := result.LastInsertId()
	return &models.SoundFile{
		ID:          id,
		SoundBankID: bankID,
		Name:        name,
		Filename:    filename,
		CreatedAt:   now,
	}, nil
}

func (r *Repository) GetSoundFile(id int64) (*models.SoundFile, error) {
	var f models.SoundFile
	err := r.db.QueryRow(
		"SELECT id, sound_bank_id, name, filename, created_at FROM sound_files WHERE id = ?",
		id,
	).Scan(&f.ID, &f.SoundBankID, &f.Name, &f.Filename, &f.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *Repository) DeleteSoundFile(id int64) error {
	_, err := r.db.Exec("DELETE FROM sound_files WHERE id = ?", id)
	return err
}

func (r *Repository) ListProjects() ([]models.Project, error) {
	rows, err := r.db.Query("SELECT id, name, code, created_at, updated_at FROM projects ORDER BY updated_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []models.Project
	for rows.Next() {
		var p models.Project
		if err := rows.Scan(&p.ID, &p.Name, &p.Code, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, nil
}

func (r *Repository) GetProject(id int64) (*models.Project, error) {
	var p models.Project
	err := r.db.QueryRow(
		"SELECT id, name, code, created_at, updated_at FROM projects WHERE id = ?",
		id,
	).Scan(&p.ID, &p.Name, &p.Code, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) CreateProject(name, code string) (*models.Project, error) {
	now := time.Now().Format(time.RFC3339)
	result, err := r.db.Exec(
		"INSERT INTO projects (name, code, created_at, updated_at) VALUES (?, ?, ?, ?)",
		name, code, now, now,
	)
	if err != nil {
		return nil, err
	}

	id, _ := result.LastInsertId()
	return &models.Project{
		ID:        id,
		Name:      name,
		Code:      code,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

func (r *Repository) UpdateProject(id int64, name, code string) (*models.Project, error) {
	_, err := r.db.Exec(
		"UPDATE projects SET name = ?, code = ?, updated_at = ? WHERE id = ?",
		name, code, time.Now().Format(time.RFC3339), id,
	)
	if err != nil {
		return nil, err
	}
	return r.GetProject(id)
}

func (r *Repository) DeleteProject(id int64) error {
	_, err := r.db.Exec("DELETE FROM projects WHERE id = ?", id)
	return err
}
