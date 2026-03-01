package repositories

import (
	"database/sql"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func setupTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("failed to open db: %v", err)
	}
	return db
}

func TestRepository_InitSchema(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := New(db)
	err := repo.InitSchema()
	if err != nil {
		t.Fatalf("failed to init schema: %v", err)
	}
}

func TestRepository_SoundBank_CRUD(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := New(db)
	repo.InitSchema()

	// Create
	bank, err := repo.CreateSoundBank("test-bank", "test description", false)
	if err != nil {
		t.Fatalf("failed to create sound bank: %v", err)
	}
	if bank.Name != "test-bank" {
		t.Errorf("expected name 'test-bank', got '%s'", bank.Name)
	}

	// List
	banks, err := repo.ListSoundBanks()
	if err != nil {
		t.Fatalf("failed to list sound banks: %v", err)
	}
	if len(banks) != 1 {
		t.Errorf("expected 1 sound bank, got %d", len(banks))
	}

	// Delete
	err = repo.DeleteSoundBank(bank.ID)
	if err != nil {
		t.Fatalf("failed to delete sound bank: %v", err)
	}

	banks, _ = repo.ListSoundBanks()
	if len(banks) != 0 {
		t.Errorf("expected 0 sound banks after delete, got %d", len(banks))
	}
}

func TestRepository_Project_CRUD(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := New(db)
	repo.InitSchema()

	// Create
	proj, err := repo.CreateProject("test-project", "sound('bd sd')")
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}
	if proj.Name != "test-project" {
		t.Errorf("expected name 'test-project', got '%s'", proj.Name)
	}

	// Get
	p, err := repo.GetProject(proj.ID)
	if err != nil {
		t.Fatalf("failed to get project: %v", err)
	}
	if p.Code != "sound('bd sd')" {
		t.Errorf("expected code, got '%s'", p.Code)
	}

	// Update
	p, err = repo.UpdateProject(proj.ID, "updated-project", "sound('hh')")
	if err != nil {
		t.Fatalf("failed to update project: %v", err)
	}
	if p.Name != "updated-project" {
		t.Errorf("expected name 'updated-project', got '%s'", p.Name)
	}

	// Delete
	err = repo.DeleteProject(proj.ID)
	if err != nil {
		t.Fatalf("failed to delete project: %v", err)
	}

	_, err = repo.GetProject(proj.ID)
	if err == nil {
		t.Error("expected error after delete, got nil")
	}
}
