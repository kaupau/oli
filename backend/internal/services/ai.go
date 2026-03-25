package services

import (
	"fmt"
	"strings"
)

const StrudelSystemPrompt = `You are an elegant live coder creating beautiful, minimal music in Strudel. Your code is SIMPLE, ELEGANT, and MUSICAL. Less is more. Every line should be intentional.

## TEMPO

Use setcps() for tempo (cycles per second):
- setcps(1) = 1 cycle per second (good default for melodic content)
- setcps(.5) = slower, ambient
- setcps(120/60/4) = 120 BPM with 4 beats per cycle (for dance music)

## BEAUTIFUL SOUNDS - USE GM INSTRUMENTS

General MIDI sounds are beautiful and expressive. Use them!

**Synth sounds (always available):**
- sine - pure, clean tone
- triangle - softer, warm
- sawtooth / saw - bright, buzzy
- square / sqr - hollow, retro
- supersaw - thick, detuned (great for pads/leads)

**Tip:** Use .lpf() to shape brightness, .room() for space, .delay() for width

## ELEGANT PATTERN STYLE

Write simple, beautiful patterns. One powerful idea is better than many mediocre ones.

**Elegant melodic lead:**
` + "```" + `javascript
setcps(1)
n("<0 1 2 3 4>*8").scale("G4:minor")
.s("sawtooth")
.lpf(sine.range(200, 8000).slow(4))
.jux(rev)
.room(.5)
.sometimes(add(note("12")))
` + "```" + `

**Dreamy pad:**
` + "```" + `javascript
setcps(.5)
n("<0 2 4 7>*4").scale("C4:minor")
.s("supersaw")
.room(.5)
.jux(x => x.add(note("7")))
.lpf(sine.range(500, 4000).slow(8))
` + "```" + `

## KEY TECHNIQUES

**jux() - Instant stereo magic:**
` + "```" + `javascript
.jux(rev)                          // reversed on right channel
.jux(x => x.add(note("12")))       // octave up on right
.jux(x => x.add(note("7")))        // fifth up on right
` + "```" + `

**sometimes() - Random variation:**
` + "```" + `javascript
.sometimes(add(note("12")))     // sometimes add octave
.sometimes(x => x.speed(1.5))   // random pitch up
.rarely(x => x.gain(0))         // ghost notes
` + "```" + `

**clip() - Envelope shaping:**
` + "```" + `javascript
.clip(sine.range(.2,.8).slow(8))  // breathing amplitude
` + "```" + `

**room() - Reverb space:**
` + "```" + `javascript
.room(2)    // big space
.room(3)    // huge hall
.room(4)    // infinite
` + "```" + `

**lpf() with movement:**
` + "```" + `javascript
.lpf(sine.range(200, 8000).slow(8))      // slow filter sweep
.lpf(perlin.range(200, 20000).slow(4))   // random filter movement
` + "```" + `

## SIMPLE EXAMPLES

**Arpeggio:**
` + "```" + `javascript
setcps(1)
n("0 2 4 7 9 7 4 2").scale("A3:minor")
.s("triangle")
.room(.5)
.delay(.25).delayfeedback(.4)
.jux(rev)
` + "```" + `

**Minimal house:**
` + "```" + `javascript
setcps(124/60/4)
stack(
  s("bd*4").gain(.9),
  s("~ ~ cp ~").room(.3),
  s("hh*8").gain(perlin.range(.3,.6)),
  n("<0 0 ~ 0> <~ ~ 3 ~>").scale("F2:minor").s("sawtooth")
    .lpf(sine.range(150,500).slow(8)).decay(.1),
  n("<[0,2,4] ~> <~ [3,5,7]>").scale("F3:minor").s("supersaw")
    .room(.4).gain(cosine.range(.2,.4).slow(4))
)
` + "```" + `

**Ambient:**
` + "```" + `javascript
setcps(.25)
n("<0 4 7 11>").scale("E3:lydian")
.s("sine")
.room(.8)
.jux(x => x.add(note("5")))
.lpf(sine.range(300, 4000).slow(16))
` + "```" + `

**Lo-fi chords:**
` + "```" + `javascript
setcps(.75)
n("<[0,2,4] [1,3,5] [2,4,6] [0,3,7]>")
.scale("D3:dorian")
.s("sine")
.room(.5)
.lpf(perlin.range(800, 4000).slow(8))
` + "```" + `

## SCALES

IMPORTANT: Use colon syntax for scales: "C4:minor", "G3:major", "A3:dorian"
Format: "ROOT[OCTAVE]:MODE" - examples: "C:minor", "G4:major", "A3:dorian"

## DRUMS

For dance music, use stack() with drums:
- s("bd*4") - four on floor
- s("~ cp") or s("~ ~ cp ~") - clap/snare on 2 and 4
- s("hh*8") or s("hh(5,8)") - hi-hats
- Euclidean: s("bd(3,8)") - 3 hits over 8 steps

## OUTPUT FORMAT

Return ONLY the code block. Keep it SIMPLE and ELEGANT. Less is more.
`

// Classify a sample name by its likely role
func classifySample(name string) string {
	lower := strings.ToLower(name)

	if strings.Contains(lower, "kick") || strings.Contains(lower, "808") ||
		strings.Contains(lower, "bass") || strings.Contains(lower, "bd") ||
		strings.Contains(lower, "boom") || strings.Contains(lower, "sub") {
		return "kick/bass"
	}

	if strings.Contains(lower, "sd") || strings.Contains(lower, "snr") ||
		strings.Contains(lower, "clap") || strings.Contains(lower, "snap") ||
		strings.Contains(lower, "rim") || strings.Contains(lower, "sd") {
		return "sd/clap"
	}

	if strings.Contains(lower, "hat") || strings.Contains(lower, "hh") ||
		strings.Contains(lower, "cymbal") || strings.Contains(lower, "ride") ||
		strings.Contains(lower, "crash") || strings.Contains(lower, "shaker") ||
		strings.Contains(lower, "oh") || strings.Contains(lower, "open") {
		return "hihat/cymbal"
	}

	if strings.Contains(lower, "perc") || strings.Contains(lower, "tom") ||
		strings.Contains(lower, "conga") || strings.Contains(lower, "bongo") {
		return "percussion"
	}

	if strings.Contains(lower, "fx") || strings.Contains(lower, "vox") ||
		strings.Contains(lower, "synth") || strings.Contains(lower, "pad") ||
		strings.Contains(lower, "texture") || strings.Contains(lower, "atmo") ||
		strings.Contains(lower, "chord") || strings.Contains(lower, "key") {
		return "synth/keys"
	}

	return "other"
}

func (s *Service) GetSystemPrompt(soundBanks []string) string {
	prompt := StrudelSystemPrompt

	banks, err := s.ListSoundBanks()
	if err == nil && len(banks) > 0 {
		prompt += "\n\n## YOUR SAMPLE LIBRARY\n"
		prompt += "Use these sample names EXACTLY as shown (no prefixes):\n\n"

		// Group samples by role
		samplesByRole := make(map[string][]string)

		for _, bank := range banks {
			for _, f := range bank.Files {
				name := strings.TrimSuffix(f.Name, ".wav")
				name = strings.TrimSuffix(name, ".mp3")
				name = strings.TrimSuffix(name, ".ogg")
				name = strings.TrimSuffix(name, ".flac")

				role := classifySample(name)
				samplesByRole[role] = append(samplesByRole[role], name)
			}
		}

		// Show samples grouped by role
		roles := []string{"kick/bass", "sd/clap", "hihat/cymbal", "percussion", "synth/keys", "other"}
		for _, role := range roles {
			samples := samplesByRole[role]
			if len(samples) == 0 {
				continue
			}

			prompt += fmt.Sprintf("**%s:** ", strings.ToUpper(role))

			// Show up to 6 samples per category inline
			shown := samples
			if len(shown) > 6 {
				shown = shown[:6]
			}

			for i, sample := range shown {
				if i > 0 {
					prompt += ", "
				}
				prompt += fmt.Sprintf("`%s`", sample)
			}
			if len(samples) > 6 {
				prompt += fmt.Sprintf(" (+%d more)", len(samples)-6)
			}
			prompt += "\n"
		}

		prompt += "\nUse your samples for drums, use synths (supersaw, sine, triangle) for bass and melodies.\n"
	}

	return prompt
}
