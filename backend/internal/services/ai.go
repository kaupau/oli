package services

import (
	"fmt"
	"sort"
	"strings"
)

const StrudelSystemPrompt = `You are StrudelVibe AI — a music assistant that creates beat patterns.

## Pattern Format
- sound("sample1 sample2 sample3") — plays samples in sequence
- s("sample1 sample2") — same thing (short form)
- ~ for rests/silence
- *N for repeats: "kick*4" plays kick 4 times

## Beat Structure (120 BPM)
- 4 steps = 1 bar (quarter notes)
- 8 steps = 1 bar (eighth notes)
- 16 steps = 1 bar (sixteenth notes)

## Layer multiple sound() calls:
sound("kick ~ kick ~")      // kicks
sound("~ snare ~ snare")    // snare on 2 and 4
sound("hihat*8")            // hihats

## Sample Selection Guide
When picking samples, think about their ROLE in the beat:

**KICK/BASS ROLE** (beat 1, downbeats):
- Look for: kick, bd, bass, 808, boom, thump, low
- These hit on beats 1 and 3 typically
- 808s are sub-bass, good for trap/hip-hop

**SNARE/CLAP ROLE** (backbeat, beats 2 and 4):
- Look for: snare, sd, clap, snap, rim, crack
- These hit on beats 2 and 4 for groove

**HIHAT/CYMBAL ROLE** (rhythm, continuous):
- Look for: hihat, hh, hat, cymbal, ride, shaker, perc
- These play steady patterns (8ths or 16ths)
- Closed hats for tight rhythm, open for accents

**TEXTURE/FX ROLE** (ear candy):
- Look for: fx, perc, vox, synth, pad, texture
- Use sparingly for variety

## Rules
1. Output ONLY sound() patterns in code blocks
2. Use EXACT sample paths from the file tree below
3. Pick samples that FIT THE ROLE (kicks for bass, snares for backbeat)
4. Create 2-4 layers (kick + snare + hats minimum)
5. Keep patterns 4, 8, or 16 steps
`

// Classify a sample name by its likely role
func classifySample(name string) string {
	lower := strings.ToLower(name)

	// Kick/Bass
	if strings.Contains(lower, "kick") || strings.Contains(lower, "808") ||
	   strings.Contains(lower, "bass") || strings.Contains(lower, "bd") ||
	   strings.Contains(lower, "boom") || strings.Contains(lower, "sub") {
		return "kick/bass"
	}

	// Snare/Clap
	if strings.Contains(lower, "snare") || strings.Contains(lower, "snr") ||
	   strings.Contains(lower, "clap") || strings.Contains(lower, "snap") ||
	   strings.Contains(lower, "rim") || strings.Contains(lower, "sd") {
		return "snare/clap"
	}

	// Hihat/Cymbal
	if strings.Contains(lower, "hat") || strings.Contains(lower, "hh") ||
	   strings.Contains(lower, "cymbal") || strings.Contains(lower, "ride") ||
	   strings.Contains(lower, "crash") || strings.Contains(lower, "shaker") {
		return "hihat/cymbal"
	}

	// Percussion
	if strings.Contains(lower, "perc") || strings.Contains(lower, "tom") ||
	   strings.Contains(lower, "conga") || strings.Contains(lower, "bongo") {
		return "percussion"
	}

	// FX/Texture
	if strings.Contains(lower, "fx") || strings.Contains(lower, "vox") ||
	   strings.Contains(lower, "synth") || strings.Contains(lower, "pad") ||
	   strings.Contains(lower, "texture") || strings.Contains(lower, "atmo") {
		return "fx/texture"
	}

	return "other"
}

func (s *Service) GetSystemPrompt(soundBanks []string) string {
	prompt := StrudelSystemPrompt

	banks, err := s.ListSoundBanks()
	if err == nil && len(banks) > 0 {
		prompt += "\n\n## YOUR SAMPLE LIBRARY\n"
		prompt += "Browse these like a file system. Use the FULL PATH in sound().\n\n"
		prompt += "```\n"
		prompt += "~/samples/\n"

		for _, bank := range banks {
			if len(bank.Files) == 0 {
				continue
			}

			prompt += fmt.Sprintf("├── %s/", bank.Name)
			if bank.IsDefault {
				prompt += " (default bank)"
			}
			prompt += "\n"

			// Group by category AND by role
			categories := make(map[string][]string)

			for _, f := range bank.Files {
				name := strings.TrimSuffix(f.Name, ".wav")
				name = strings.TrimSuffix(name, ".mp3")
				name = strings.TrimSuffix(name, ".ogg")
				name = strings.TrimSuffix(name, ".flac")

				// Parse category :: samplename format
				var category, sampleName string
				if parts := strings.SplitN(name, " :: ", 2); len(parts) == 2 {
					category = strings.TrimSpace(parts[0])
					sampleName = strings.TrimSpace(parts[1])
				} else {
					category = "uncategorized"
					sampleName = name
				}

				// Add role hint
				role := classifySample(name)
				fullEntry := fmt.Sprintf("%s :: %s", category, sampleName)

				// Group by role for better organization
				roleKey := fmt.Sprintf("%s [%s]", category, role)
				categories[roleKey] = append(categories[roleKey], fullEntry)
			}

			// Sort and output
			catNames := make([]string, 0, len(categories))
			for cat := range categories {
				catNames = append(catNames, cat)
			}
			sort.Strings(catNames)

			for i, cat := range catNames {
				samples := categories[cat]
				prefix := "│   ├──"
				if i == len(catNames)-1 {
					prefix = "│   └──"
				}

				prompt += fmt.Sprintf("%s %s\n", prefix, cat)

				// Show samples with tree structure
				for j, sample := range samples {
					samplePrefix := "│   │   ├──"
					if i == len(catNames)-1 {
						samplePrefix = "│       ├──"
					}
					if j == len(samples)-1 {
						if i == len(catNames)-1 {
							samplePrefix = "│       └──"
						} else {
							samplePrefix = "│   │   └──"
						}
					}

					// Only show first 10 samples per category to avoid overwhelming
					if j < 10 {
						prompt += fmt.Sprintf("%s \"%s\"\n", samplePrefix, sample)
					} else if j == 10 {
						remaining := len(samples) - 10
						prompt += fmt.Sprintf("%s ... and %d more\n", samplePrefix, remaining)
						break
					}
				}
			}
		}

		prompt += "```\n"

		prompt += "\n## HOW TO USE SAMPLES\n"
		prompt += "Copy the exact string from the tree above:\n"
		prompt += "```javascript\n"
		prompt += "// Example - if you see '\"kick :: punchy\"' in the tree:\n"
		prompt += "sound(\"kick :: punchy ~ kick :: punchy ~\")\n"
		prompt += "\n"
		prompt += "// Layer multiple roles:\n"
		prompt += "sound(\"kick :: punchy ~ kick :: punchy ~\")  // [kick/bass] role\n"
		prompt += "sound(\"~ snare :: tight ~ snare :: tight\")  // [snare/clap] role  \n"
		prompt += "sound(\"hihat :: closed*8\")                   // [hihat/cymbal] role\n"
		prompt += "```\n"
	}

	return prompt
}
