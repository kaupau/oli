package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strudelvibe/internal/models"
	"strudelvibe/internal/repositories"
)

type Service struct {
	repo      *repositories.Repository
	uploadDir string
}

func New(repo *repositories.Repository, uploadDir string) *Service {
	return &Service{repo: repo, uploadDir: uploadDir}
}

func (s *Service) ListSoundBanks() ([]models.SoundBankWithFiles, error) {
	banks, err := s.repo.ListSoundBanks()
	if err != nil {
		return nil, err
	}

	var result []models.SoundBankWithFiles
	for _, b := range banks {
		files, err := s.repo.GetSoundBankFiles(b.ID)
		if err != nil {
			return nil, err
		}
		result = append(result, models.SoundBankWithFiles{
			SoundBank: b,
			Files:     files,
		})
	}
	return result, nil
}

func (s *Service) CreateSoundBank(name, description string) (*models.SoundBank, error) {
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	return s.repo.CreateSoundBank(name, description, false)
}

func (s *Service) DeleteSoundBank(id int64) error {
	if id == 0 {
		return fmt.Errorf("invalid id")
	}
	return s.repo.DeleteSoundBank(id)
}

func (s *Service) UploadSoundFile(bankID int64, file *multipart.FileHeader) (*models.SoundFile, error) {
	if bankID == 0 {
		return nil, fmt.Errorf("invalid sound bank id")
	}
	if file == nil {
		return nil, fmt.Errorf("no file provided")
	}

	src, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	filename := fmt.Sprintf("%d_%s", bankID, file.Filename)
	dst, err := s.createFile(filename)
	if err != nil {
		return nil, err
	}
	defer dst.Close()

	if _, err := dst.ReadFrom(src); err != nil {
		return nil, err
	}

	return s.repo.AddSoundFile(bankID, file.Filename, filename)
}

func (s *Service) DeleteSoundFile(id int64) error {
	if id == 0 {
		return fmt.Errorf("invalid id")
	}

	// Look up the file by ID to get its disk filename
	file, err := s.repo.GetSoundFile(id)
	if err == nil && file != nil {
		s.deleteFile(file.Filename)
	}

	return s.repo.DeleteSoundFile(id)
}

func (s *Service) ListProjects() ([]models.Project, error) {
	return s.repo.ListProjects()
}

func (s *Service) GetProject(id int64) (*models.Project, error) {
	if id == 0 {
		return nil, fmt.Errorf("invalid id")
	}
	return s.repo.GetProject(id)
}

func (s *Service) CreateProject(name, code string) (*models.Project, error) {
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if code == "" {
		code = "-- Welcome to StrudelVibe!\nsound(\"bd sd\")\n"
	}
	return s.repo.CreateProject(name, code)
}

func (s *Service) UpdateProject(id int64, name, code string) (*models.Project, error) {
	if id == 0 {
		return nil, fmt.Errorf("invalid id")
	}
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	return s.repo.UpdateProject(id, name, code)
}

func (s *Service) DeleteProject(id int64) error {
	if id == 0 {
		return fmt.Errorf("invalid id")
	}
	return s.repo.DeleteProject(id)
}

func (s *Service) InitDefaults() error {
	// Check if default banks already exist — skip if so
	hasDefaults, err := s.repo.HasDefaultBanks()
	if err != nil {
		return err
	}
	if hasDefaults {
		return nil
	}

	defaults := []struct {
		name        string
		description string
	}{
		{"drums", "Basic drum kit - kick, snare, hi-hat, etc."},
		{"bass", "Bass sounds and one-shots"},
		{"synth", "Synth stabs and leads"},
		{"fx", "Effects and miscellaneous"},
	}

	for _, d := range defaults {
		_, err := s.repo.CreateSoundBank(d.name, d.description, true)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) createFile(filename string) (*os.File, error) {
	path := filepath.Join(s.uploadDir, filename)
	return os.Create(path)
}

func (s *Service) deleteFile(filename string) error {
	path := filepath.Join(s.uploadDir, filename)
	return os.Remove(path)
}

func (s *Service) GetUploadDir() string {
	return s.uploadDir
}

func (s *Service) ServeFile(filename string) (io.ReadCloser, error) {
	path := filepath.Join(s.uploadDir, filename)
	return os.Open(path)
}
