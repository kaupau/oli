package services

import (
	"fmt"
	"sort"
	"strings"
)

const StrudelSystemPrompt = `You are a DJ and beat producer. You create FIRE beats, not basic loops.

## STRUDEL SYNTAX

**Basics:**
- sound("kick snare") — sequence
- sound("kick snare")*2 — repeat whole pattern
- sound("kick*4") — repeat single sound
- ~ = rest/silence
- [a b] = subdivide (fit both in one step)
- <a b> = alternate each cycle
- ? = 50% chance to play
- ! = always play

**Effects (chain these):**
.gain(0.8)        // volume 0-1
.speed(1.5)       // pitch up
.speed(0.5)       // pitch down (slow, deep)
.pan(0.3)         // stereo: 0=left, 0.5=center, 1=right
.lpf(800)         // lowpass filter (Hz) - darker/muddier
.hpf(200)         // highpass filter - thinner/brighter
.delay(0.5)       // echo amount
.room(0.3)        // reverb

**Rhythm tricks:**
.fast(2)          // double speed
.slow(2)          // half speed
.euclid(3,8)      // euclidean rhythm (hits, steps)
.sometimes(x=>x.speed(2))  // random variation

## GENRE TEMPLATES

**Trap/808:**
sound("808:0 ~ ~ 808:0 ~ ~ 808:0 ~").speed(0.8).gain(0.9)
sound("~ ~ ~ ~ snare ~ ~ ~")
sound("[hh hh] [hh hh] [hh hh] [hh [hh hh]]").gain(0.6)
sound("~ ~ ~ ~ ~ ~ ~ hh:open").gain(0.4)

**House/Techno:**
sound("kick ~ ~ kick ~ ~ kick ~").gain(0.85)
sound("~ ~ clap ~ ~ ~ clap ~")
sound("hh*8").gain(0.5)
sound("~ ~ ~ ~ oh ~ ~ ~").gain(0.3)

**Boom Bap:**
sound("kick ~ ~ ~ kick ~ ~ ~")
sound("~ ~ snare ~ ~ ~ snare ~").gain(0.9)
sound("hh*8").gain(0.4).pan("<0.3 0.7>")

**Drill:**
sound("808 ~ ~ 808 ~ 808 ~ ~").speed(0.7).gain(0.95)
sound("~ ~ ~ snare ~ ~ snare ~").speed(1.1)
sound("[hh hh hh] [hh hh hh] [hh hh hh] [hh hh hh]").gain(0.5)

**Lo-fi:**
sound("kick ~ kick ~").lpf(600).gain(0.7)
sound("~ snare ~ snare").lpf(800).gain(0.6)
sound("hh*8").lpf(2000).gain(0.3).pan(0.6)

## WHAT MAKES BEATS HIT

1. **GROOVE** - Don't just do kick-snare-kick-snare. Add ghost notes, offbeats, syncopation
2. **DYNAMICS** - Vary .gain() so not everything is same volume. Kicks loud, hats quiet
3. **TEXTURE** - Layer 2+ hihat patterns. Add percs, shakers, rides
4. **VARIATION** - Use <a b> to alternate, ? for randomness
5. **SPACE** - Use ~ rests. Don't fill every single step
6. **WIDTH** - Pan hats and percs left/right
7. **DEPTH** - Use .lpf() on some elements, .room() for space
8. **BOUNCE** - Subdivide with [a b] for rolls, triplet feels

## RULES

1. Output ONLY sound() code in a code block
2. Use EXACT sample names from the library below
3. Create 4-8 layers minimum (not just kick+snare+hat)
4. Apply effects - .gain() on everything at minimum
5. Make it INTERESTING - syncopation, ghost notes, variation
6. Think like a producer, not a metronome
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

		prompt += "\n## EXAMPLE BEAT (use your samples like this)\n"
		prompt += "```javascript\n"
		prompt += "// HARD TRAP BEAT - notice the layers, effects, variation\n"
		prompt += "sound(\"kick :: deep ~ ~ kick :: deep ~ kick :: deep ~ ~\").gain(0.9)\n"
		prompt += "sound(\"~ ~ ~ ~ snare :: crack ~ ~ ~\").gain(0.85).room(0.1)\n"
		prompt += "sound(\"~ ~ ~ ~ ~ ~ snare :: rim ~\").gain(0.4) // ghost snare\n"
		prompt += "sound(\"[hh :: closed hh :: closed] [hh :: closed hh :: closed] [hh :: closed hh :: closed] [hh :: closed [hh :: closed hh :: closed]]\").gain(0.5)\n"
		prompt += "sound(\"~ ~ ~ ~ ~ ~ ~ hh :: open\").gain(0.35).pan(0.7)\n"
		prompt += "sound(\"perc :: rim*8\").gain(0.2).pan(0.3).lpf(2000) // texture\n"
		prompt += "```\n"
		prompt += "\nNow create a beat using the samples below. Be creative. Make it knock.\n"
	}

	return prompt
}
