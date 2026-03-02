package config

import (
	"os"
	"path/filepath"
)

type Config struct {
	Port         string
	UploadDir    string
	DBPath       string
	StaticURL    string
	StaticDir    string
	AnthropicKey string
	Password     string
}

func Load() *Config {
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "uploads"
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "strudelvibe.db"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	return &Config{
		Port:         port,
		UploadDir:    uploadDir,
		DBPath:       dbPath,
		StaticURL:    "/uploads",
		StaticDir:    os.Getenv("STATIC_DIR"),
		AnthropicKey: os.Getenv("ANTHROPIC_API_KEY"),
		Password:     os.Getenv("APP_PASSWORD"),
	}
}

func (c *Config) EnsureDirs() error {
	return os.MkdirAll(c.UploadDir, 0755)
}

func (c *Config) UploadPath(filename string) string {
	return filepath.Join(c.UploadDir, filename)
}
