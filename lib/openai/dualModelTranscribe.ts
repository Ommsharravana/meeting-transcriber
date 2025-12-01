import {
  TranscriptionOptions,
  Transcript,
  TranscriptSegment,
} from '@/types/transcription';
import { transcribeAudio } from './transcribe';
import { assignSpeakerColors } from '@/lib/utils/colors';

export interface DualModelProgress {
  phase: 'quality' | 'diarization' | 'merging' | 'complete';
  overallProgress: number;
  message: string;
}

/**
 * Run dual model transcription:
 * 1. GPT-4o Transcribe for highest quality text
 * 2. GPT-4o Diarize for speaker identification and timestamps
 * 3. Merge: Use quality text with diarization structure
 */
export async function transcribeDualModel(
  file: File | Blob,
  apiKey: string,
  options: TranscriptionOptions,
  onProgress?: (progress: DualModelProgress) => void
): Promise<Transcript> {
  const fileName = file instanceof File ? file.name : 'recording.webm';

  // Phase 1: Run GPT-4o Transcribe for best quality text
  onProgress?.({
    phase: 'quality',
    overallProgress: 5,
    message: 'Running GPT-4o Transcribe for best quality text...',
  });

  const qualityOptions: TranscriptionOptions = {
    ...options,
    model: 'gpt-4o-transcribe',
    responseFormat: 'json',
    chunkingStrategy: undefined,
  };

  const qualityResult = await transcribeAudio(
    file,
    apiKey,
    qualityOptions,
    (progress) => {
      onProgress?.({
        phase: 'quality',
        overallProgress: 5 + progress * 0.4, // 5-45%
        message: 'Running GPT-4o Transcribe for best quality text...',
      });
    }
  );

  // Phase 2: Run GPT-4o Diarize for speaker identification
  onProgress?.({
    phase: 'diarization',
    overallProgress: 50,
    message: 'Running GPT-4o Diarize for speaker identification...',
  });

  const diarizeOptions: TranscriptionOptions = {
    ...options,
    model: 'gpt-4o-transcribe-diarize',
    responseFormat: 'diarized_json',
    chunkingStrategy: 'auto',
    prompt: undefined, // Diarize doesn't support prompt
  };

  const diarizeResult = await transcribeAudio(
    file,
    apiKey,
    diarizeOptions,
    (progress) => {
      onProgress?.({
        phase: 'diarization',
        overallProgress: 50 + progress * 0.4, // 50-90%
        message: 'Running GPT-4o Diarize for speaker identification...',
      });
    }
  );

  // Phase 3: Merge results - use quality text with diarization structure
  onProgress?.({
    phase: 'merging',
    overallProgress: 92,
    message: 'Merging transcripts: combining quality text with speaker data...',
  });

  const mergedTranscript = mergeQualityWithDiarization(
    qualityResult,
    diarizeResult,
    fileName
  );

  onProgress?.({
    phase: 'complete',
    overallProgress: 100,
    message: 'Dual model transcription complete!',
  });

  return mergedTranscript;
}

/**
 * Merge the high-quality text from GPT-4o Transcribe with
 * the speaker/timing information from GPT-4o Diarize
 */
function mergeQualityWithDiarization(
  qualityTranscript: Transcript,
  diarizeTranscript: Transcript,
  fileName: string
): Transcript {
  // If diarization has no segments, just return quality result
  if (!diarizeTranscript.segments || diarizeTranscript.segments.length === 0) {
    return {
      ...qualityTranscript,
      model: 'gpt-4o-transcribe', // Primary model used
    };
  }

  // Strategy: Use diarization segments for structure (speakers, timing)
  // but try to use quality text where possible

  const qualityText = qualityTranscript.text;
  const diarizeSegments = diarizeTranscript.segments;

  // Attempt to align quality text with diarization segments
  // This is a best-effort approach since the texts may differ slightly
  const mergedSegments: TranscriptSegment[] = [];
  let qualityTextIndex = 0;

  for (let i = 0; i < diarizeSegments.length; i++) {
    const segment = diarizeSegments[i];
    const diarizeText = segment.text.trim();

    // Try to find a matching portion in the quality text
    // Look for the start of the diarize text in the quality text
    const matchIndex = findBestMatch(qualityText, qualityTextIndex, diarizeText);

    let segmentText: string;

    if (matchIndex >= 0) {
      // Found a reasonable match - use quality text
      // Determine the end of this segment (start of next segment or end of quality text)
      let endIndex: number;

      if (i < diarizeSegments.length - 1) {
        const nextSegmentText = diarizeSegments[i + 1].text.trim();
        const nextMatchIndex = findBestMatch(qualityText, matchIndex + 1, nextSegmentText);

        if (nextMatchIndex > matchIndex) {
          endIndex = nextMatchIndex;
        } else {
          // Can't find next segment, estimate based on diarize text length
          endIndex = Math.min(
            matchIndex + diarizeText.length + 20, // Add some buffer
            qualityText.length
          );
        }
      } else {
        // Last segment - take until end
        endIndex = qualityText.length;
      }

      segmentText = qualityText.substring(matchIndex, endIndex).trim();
      qualityTextIndex = endIndex;
    } else {
      // No match found - use diarize text (fallback)
      segmentText = diarizeText;
    }

    mergedSegments.push({
      id: `seg-${i}`,
      speaker: segment.speaker,
      text: segmentText || diarizeText, // Fallback to diarize text if empty
      start: segment.start,
      end: segment.end,
    });
  }

  // Get unique speakers and assign colors
  const speakers = [...new Set(mergedSegments.map(s => s.speaker))];
  const speakerColors = assignSpeakerColors(speakers);

  // Calculate total duration
  const duration = mergedSegments.length > 0
    ? Math.max(...mergedSegments.map(s => s.end))
    : diarizeTranscript.duration;

  return {
    id: crypto.randomUUID(),
    text: qualityText, // Use the full quality text
    segments: mergedSegments,
    duration,
    model: 'gpt-4o-transcribe', // Primary quality model
    createdAt: new Date(),
    fileName,
    speakerColors,
    speakerNames: {},
  };
}

/**
 * Find the best match for a target text within the source text
 * starting from a given index. Uses fuzzy matching.
 */
function findBestMatch(source: string, startIndex: number, target: string): number {
  if (!target || target.length < 3) return -1;

  const sourceLower = source.toLowerCase();
  const targetLower = target.toLowerCase();

  // Try exact match first (first few words)
  const targetWords = targetLower.split(/\s+/).filter(w => w.length > 2);
  if (targetWords.length === 0) return -1;

  // Look for the first significant word
  const firstWord = targetWords[0];
  const searchStart = Math.max(0, startIndex - 50); // Allow some backtrack

  let searchIndex = sourceLower.indexOf(firstWord, searchStart);

  // If found, verify with more words
  if (searchIndex >= 0 && targetWords.length > 1) {
    // Check if second word follows within reasonable distance
    const nextSearchStart = searchIndex + firstWord.length;
    const secondWord = targetWords[1];
    const secondWordIndex = sourceLower.indexOf(secondWord, nextSearchStart);

    // Second word should be within 50 chars of first
    if (secondWordIndex < 0 || secondWordIndex - nextSearchStart > 50) {
      // Try to find a better match further ahead
      const altIndex = sourceLower.indexOf(firstWord, searchIndex + 1);
      if (altIndex >= 0 && altIndex < searchIndex + 200) {
        searchIndex = altIndex;
      }
    }
  }

  return searchIndex;
}
