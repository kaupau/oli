package models

type SoundBank struct {
	ID          int64  `json:"id" db:"id"`
	Name        string `json:"name" db:"name"`
	Description string `json:"description" db:"description"`
	IsDefault   bool   `json:"is_default" db:"is_default"`
	CreatedAt   string `json:"created_at" db:"created_at"`
}

type SoundFile struct {
	ID          int64  `json:"id" db:"id"`
	SoundBankID int64  `json:"sound_bank_id" db:"sound_bank_id"`
	Name        string `json:"name" db:"name"`
	Filename    string `json:"filename" db:"filename"`
	CreatedAt   string `json:"created_at" db:"created_at"`
}

type Project struct {
	ID        int64  `json:"id" db:"id"`
	Name      string `json:"name" db:"name"`
	Code      string `json:"code" db:"code"`
	CreatedAt string `json:"created_at" db:"created_at"`
	UpdatedAt string `json:"updated_at" db:"updated_at"`
}

type SoundBankWithFiles struct {
	SoundBank
	Files []SoundFile `json:"files"`
}
