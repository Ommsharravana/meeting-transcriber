import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// Common ffmpeg installation paths on different systems
const FFMPEG_PATHS = [
  '/opt/homebrew/bin/ffmpeg',      // macOS Apple Silicon (Homebrew)
  '/usr/local/bin/ffmpeg',          // macOS Intel (Homebrew) / Linux
  '/usr/bin/ffmpeg',                // Linux system install
  'ffmpeg',                          // Fallback to PATH
];

const FFPROBE_PATHS = [
  '/opt/homebrew/bin/ffprobe',      // macOS Apple Silicon (Homebrew)
  '/usr/local/bin/ffprobe',          // macOS Intel (Homebrew) / Linux
  '/usr/bin/ffprobe',                // Linux system install
  'ffprobe',                          // Fallback to PATH
];

// Find working ffmpeg/ffprobe paths
let ffmpegPath: string | null = null;
let ffprobePath: string | null = null;

async function findExecutable(paths: string[]): Promise<string | null> {
  for (const p of paths) {
    if (p.startsWith('/')) {
      // Absolute path - check if file exists
      if (existsSync(p)) {
        return p;
      }
    } else {
      // Relative/command - try to run it
      try {
        await execAsync(`${p} -version`);
        return p;
      } catch {
        // Not found, try next
      }
    }
  }
  return null;
}

async function getFFmpegPath(): Promise<string> {
  if (!ffmpegPath) {
    ffmpegPath = await findExecutable(FFMPEG_PATHS);
  }
  if (!ffmpegPath) {
    throw new Error('FFmpeg not found. Please install ffmpeg.');
  }
  return ffmpegPath;
}

async function getFFprobePath(): Promise<string> {
  if (!ffprobePath) {
    ffprobePath = await findExecutable(FFPROBE_PATHS);
  }
  if (!ffprobePath) {
    throw new Error('FFprobe not found. Please install ffmpeg.');
  }
  return ffprobePath;
}

// Get audio duration using ffprobe
async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const ffprobe = await getFFprobePath();
    const { stdout } = await execAsync(
      `"${ffprobe}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    );
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error('[Split API] Failed to get duration:', error);
    throw new Error('Failed to analyze audio file');
  }
}

// Split audio into chunks using ffmpeg
async function splitAudio(
  inputPath: string,
  outputDir: string,
  chunkDurationSeconds: number
): Promise<string[]> {
  const ffmpeg = await getFFmpegPath();
  const duration = await getAudioDuration(inputPath);
  const numChunks = Math.ceil(duration / chunkDurationSeconds);
  const chunkPaths: string[] = [];

  console.log(`[Split API] Splitting ${duration}s audio into ${numChunks} chunks using ${ffmpeg}`);

  for (let i = 0; i < numChunks; i++) {
    const startTime = i * chunkDurationSeconds;
    const outputPath = path.join(outputDir, `chunk_${i}.mp3`);

    await execAsync(
      `"${ffmpeg}" -y -i "${inputPath}" -ss ${startTime} -t ${chunkDurationSeconds} -acodec libmp3lame -q:a 2 "${outputPath}"`
    );

    chunkPaths.push(outputPath);
  }

  return chunkPaths;
}

export async function POST(request: NextRequest) {
  const tempDir = path.join(os.tmpdir(), `audio-split-${Date.now()}`);
  let inputPath = '';

  try {
    // Check if ffmpeg is available (searches common paths)
    try {
      const ffmpegPath = await getFFmpegPath();
      console.log(`[Split API] Using ffmpeg at: ${ffmpegPath}`);
    } catch {
      return NextResponse.json(
        { error: 'FFmpeg is not installed on the server. Please install ffmpeg via Homebrew: brew install ffmpeg' },
        { status: 500 }
      );
    }

    // Create temp directory
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const chunkDuration = parseInt(formData.get('chunkDuration') as string) || 600;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Save file to temp location
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || '.mp3';
    inputPath = path.join(tempDir, `input${ext}`);
    await writeFile(inputPath, buffer);

    console.log(`[Split API] Processing file: ${file.name}, size: ${file.size}`);

    // Get duration first
    const duration = await getAudioDuration(inputPath);
    console.log(`[Split API] Audio duration: ${duration}s`);

    // Check if splitting is needed
    const MAX_DURATION = 1200; // 20 minutes threshold
    if (duration <= MAX_DURATION) {
      // No splitting needed, return the original file
      const fileData = await readFile(inputPath);
      await cleanup(tempDir, inputPath, []);

      return NextResponse.json({
        needsChunking: false,
        duration,
        chunks: [
          {
            index: 0,
            data: fileData.toString('base64'),
            mimeType: 'audio/mp3',
          },
        ],
      });
    }

    // Split the audio
    const chunkPaths = await splitAudio(inputPath, tempDir, chunkDuration);
    console.log(`[Split API] Created ${chunkPaths.length} chunks`);

    // Read all chunks and convert to base64
    const chunks = await Promise.all(
      chunkPaths.map(async (chunkPath, index) => {
        const data = await readFile(chunkPath);
        return {
          index,
          data: data.toString('base64'),
          mimeType: 'audio/mp3',
        };
      })
    );

    // Cleanup
    await cleanup(tempDir, inputPath, chunkPaths);

    return NextResponse.json({
      needsChunking: true,
      duration,
      totalChunks: chunks.length,
      chunks,
    });
  } catch (error) {
    console.error('[Split API] Error:', error);

    // Cleanup on error
    await cleanup(tempDir, inputPath, []).catch(() => {});

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process audio',
      },
      { status: 500 }
    );
  }
}

async function cleanup(tempDir: string, inputPath: string, chunkPaths: string[]) {
  try {
    if (inputPath && existsSync(inputPath)) {
      await unlink(inputPath);
    }
    for (const chunkPath of chunkPaths) {
      if (existsSync(chunkPath)) {
        await unlink(chunkPath);
      }
    }
    if (existsSync(tempDir)) {
      const { rmdir } = await import('fs/promises');
      await rmdir(tempDir);
    }
  } catch (e) {
    console.warn('[Split API] Cleanup warning:', e);
  }
}
