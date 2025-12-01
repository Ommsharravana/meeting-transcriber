import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  console.log('[API Route] Summarize request received');

  try {
    // Get the request body
    const body = await request.json();
    const { transcript, type = 'summary' } = body;

    if (!transcript) {
      return NextResponse.json(
        { error: { message: 'Transcript text is required' } },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: { message: 'OpenAI API key not configured' } },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build the prompt based on type
    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'summary':
        systemPrompt = 'You are an expert meeting summarizer. Provide clear, concise, and actionable summaries.';
        userPrompt = `Please summarize the following meeting transcript. Include:
1. **Key Discussion Points** - Main topics covered
2. **Decisions Made** - Any conclusions or agreements reached
3. **Action Items** - Tasks assigned with owners if mentioned
4. **Next Steps** - Follow-up items or future discussions needed

Keep the summary concise but comprehensive.

Transcript:
${transcript}`;
        break;

      case 'action-items':
        systemPrompt = 'You are an expert at extracting action items from meeting transcripts.';
        userPrompt = `Extract all action items from the following meeting transcript. For each action item, identify:
- The task to be done
- Who is responsible (if mentioned)
- Deadline (if mentioned)

Format as a clear, numbered list.

Transcript:
${transcript}`;
        break;

      case 'key-points':
        systemPrompt = 'You are an expert at identifying key points from conversations.';
        userPrompt = `Identify the key points from the following transcript. List them as bullet points, focusing on:
- Important information shared
- Key questions asked and answers given
- Notable statements or quotes

Transcript:
${transcript}`;
        break;

      case 'questions':
        systemPrompt = 'You are an expert at extracting Q&A pairs from conversations.';
        userPrompt = `From the following transcript, extract all questions that were asked and their corresponding answers (if provided). Format as Q&A pairs.

Transcript:
${transcript}`;
        break;

      default:
        systemPrompt = 'You are an expert meeting analyst.';
        userPrompt = `Please analyze the following transcript and provide helpful insights:

${transcript}`;
    }

    console.log('[API Route] Calling OpenAI API...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const result = completion.choices[0]?.message?.content || 'No summary generated';

    console.log('[API Route] OpenAI response received');

    return NextResponse.json({
      result: result.trim(),
      type,
    });
  } catch (error: any) {
    console.error('Summarize API error:', error);

    return NextResponse.json(
      { error: { message: error.message || 'Internal server error' } },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
