// Voice Matching Algorithm for Mongolian AI Dubbing
// Matches speakers to the most suitable Mongolian voices based on traits

import type { Speaker, MongolianVoice, VoiceAssignment, SpeakerTraits } from './types'
import { mongolianVoices } from './mongolian-voices'

interface MatchScore {
  voice: MongolianVoice
  score: number
  breakdown: {
    genderMatch: number
    ageMatch: number
    styleMatch: number
    qualityScore: number
  }
}

// Calculate how well a voice matches speaker traits
function calculateMatchScore(
  traits: SpeakerTraits,
  voice: MongolianVoice
): MatchScore {
  let genderMatch = 0
  let ageMatch = 0
  let styleMatch = 0

  // Gender matching (most important)
  if (traits.gender === voice.gender) {
    genderMatch = 100
  } else if (voice.gender === 'neutral') {
    genderMatch = 70 // Neutral voices can work for any gender
  } else {
    genderMatch = 0
  }

  // Age range matching
  const ageRanges = ['child', 'young-adult', 'adult', 'senior']
  const traitAgeIndex = ageRanges.indexOf(traits.ageRange)
  const voiceAgeIndex = ageRanges.indexOf(voice.ageRange)
  const ageDiff = Math.abs(traitAgeIndex - voiceAgeIndex)
  
  if (ageDiff === 0) {
    ageMatch = 100
  } else if (ageDiff === 1) {
    ageMatch = 70
  } else if (ageDiff === 2) {
    ageMatch = 40
  } else {
    ageMatch = 20
  }

  // Speaking style matching
  const styleCompatibility: Record<string, string[]> = {
    calm: ['calm', 'gentle', 'warm'],
    energetic: ['energetic', 'warm'],
    serious: ['serious', 'authoritative', 'calm'],
    warm: ['warm', 'gentle', 'calm'],
    authoritative: ['authoritative', 'serious'],
    gentle: ['gentle', 'warm', 'calm'],
  }

  const compatibleStyles = styleCompatibility[traits.speakingStyle] || []
  if (voice.style === traits.speakingStyle) {
    styleMatch = 100
  } else if (compatibleStyles.includes(voice.style)) {
    styleMatch = 70
  } else {
    styleMatch = 30
  }

  // Quality score based on voice ratings (prioritize naturalness for Mongolian speech)
  const qualityScore =
    (voice.naturalness * 3 + voice.clarity * 2 + voice.emotionalRange) / 6 * 20

  // Weighted total score
  const totalScore =
    genderMatch * 0.35 + // Gender is critical
    ageMatch * 0.25 + // Age matters for believability
    styleMatch * 0.25 + // Style affects emotional delivery
    qualityScore * 0.15 // Quality ensures natural Mongolian speech

  return {
    voice,
    score: totalScore,
    breakdown: {
      genderMatch,
      ageMatch,
      styleMatch,
      qualityScore,
    },
  }
}

// Get recommended voices for a speaker, sorted by match score
export function getRecommendedVoices(
  speaker: Speaker,
  limit: number = 5
): MatchScore[] {
  const scores = mongolianVoices.map((voice) =>
    calculateMatchScore(speaker.inferredTraits, voice)
  )

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  return scores.slice(0, limit)
}

// Auto-assign voices to all speakers
export function autoAssignVoices(speakers: Speaker[]): Map<string, VoiceAssignment> {
  const assignments = new Map<string, VoiceAssignment>()
  const usedVoices = new Set<string>()

  // Sort speakers by dialogue count (more dialogue = higher priority for best match)
  const sortedSpeakers = [...speakers].sort(
    (a, b) => b.dialogueCount - a.dialogueCount
  )

  for (const speaker of sortedSpeakers) {
    const recommendations = getRecommendedVoices(speaker, 10)

    // Find the best available voice (not already used)
    const bestAvailable = recommendations.find(
      (rec) => !usedVoices.has(rec.voice.id)
    )

    if (bestAvailable) {
      usedVoices.add(bestAvailable.voice.id)
      assignments.set(speaker.id, {
        speakerId: speaker.id,
        voiceId: bestAvailable.voice.id,
        assignmentType: 'auto',
        confidence: bestAvailable.score / 100,
        customizations: {
          pitchAdjustment: 0,
          speedAdjustment: 0,
          volumeAdjustment: 0,
        },
      })
    } else {
      // If all voices are used, assign the best match anyway
      const bestMatch = recommendations[0]
      if (bestMatch) {
        assignments.set(speaker.id, {
          speakerId: speaker.id,
          voiceId: bestMatch.voice.id,
          assignmentType: 'auto',
          confidence: bestMatch.score / 100,
          customizations: {
            pitchAdjustment: 0,
            speedAdjustment: 0,
            volumeAdjustment: 0,
          },
        })
      }
    }
  }

  return assignments
}

// Create a manual voice assignment
export function createManualAssignment(
  speakerId: string,
  voiceId: string,
  speaker: Speaker
): VoiceAssignment {
  const voice = mongolianVoices.find((v) => v.id === voiceId)
  let confidence = 0.5 // Default confidence for manual

  if (voice) {
    const matchScore = calculateMatchScore(speaker.inferredTraits, voice)
    confidence = matchScore.score / 100
  }

  return {
    speakerId,
    voiceId,
    assignmentType: 'manual',
    confidence,
    customizations: {
      pitchAdjustment: 0,
      speedAdjustment: 0,
      volumeAdjustment: 0,
    },
  }
}
