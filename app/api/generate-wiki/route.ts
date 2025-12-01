import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  console.log('[API Route] Generate wiki request received');

  try {
    const body = await request.json();
    const { transcript, title } = body;

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

    // Build the prompt for structured wiki generation
    const prompt = `Analyze the following meeting transcript and generate a comprehensive, structured wiki-style summary. Return ONLY valid JSON with no additional text.

The JSON structure must be:
{
  "title": "Meeting title (infer from content or use '${title || 'Meeting Summary'}')",
  "date": "Today's date or inferred date from transcript",
  "overview": "2-3 sentence executive summary of the meeting",
  "participants": ["List of participants mentioned or inferred"],
  "topics": ["Main topics/agenda items discussed"],
  "keyPoints": [
    {"point": "Key point text", "speaker": "Who made this point (if known)"}
  ],
  "decisions": [
    {"decision": "What was decided", "context": "Brief context or reason"}
  ],
  "actionItems": [
    {"task": "Specific task", "owner": "Person responsible", "deadline": "Due date if mentioned", "priority": "high/medium/low"}
  ],
  "nextSteps": ["List of next steps or follow-ups"],
  "openQuestions": ["Unresolved questions or items for future discussion"],
  "notes": "Any additional important notes or context"
}

Guidelines:
- Be comprehensive but concise
- Extract ALL decisions made during the meeting
- Identify ALL action items with owners when mentioned
- List participants based on speaker attribution or names mentioned
- Topics should reflect the main themes/agenda items
- For priority: "urgent", "ASAP", "critical" = high; "soon", "next week" = medium; others = low
- If something is not mentioned, use null or empty array

Transcript:
${transcript}

JSON:`;

    console.log('[API Route] Calling OpenAI API for wiki generation...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert meeting analyst who creates comprehensive wiki-style meeting documentation. Always respond with valid JSON only.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 3000,
      temperature: 0.5,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    console.log('[API Route] OpenAI response received');

    // Parse the JSON response
    let wiki = null;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        wiki = JSON.parse(jsonMatch[0]);
      } else {
        console.warn('[API Route] No JSON object found in response');
        return NextResponse.json(
          { error: { message: 'Failed to parse wiki response' } },
          { status: 500 }
        );
      }
    } catch (parseError) {
      console.error('[API Route] Failed to parse wiki JSON:', parseError);
      return NextResponse.json(
        { error: { message: 'Failed to parse wiki response' } },
        { status: 500 }
      );
    }

    // Enrich the response with metadata
    const enrichedWiki = {
      id: `wiki-${Date.now()}`,
      ...wiki,
      actionItems: (wiki.actionItems || []).map((item: any, index: number) => ({
        id: `wiki-action-${Date.now()}-${index}`,
        task: item.task || '',
        owner: item.owner || null,
        deadline: item.deadline || null,
        priority: item.priority || 'medium',
        completed: false,
      })),
      keyPoints: (wiki.keyPoints || []).map((kp: any, index: number) => ({
        id: `kp-${index}`,
        point: typeof kp === 'string' ? kp : kp.point,
        speaker: typeof kp === 'string' ? null : kp.speaker,
      })),
      decisions: (wiki.decisions || []).map((d: any, index: number) => ({
        id: `decision-${index}`,
        decision: typeof d === 'string' ? d : d.decision,
        context: typeof d === 'string' ? null : d.context,
      })),
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      wiki: enrichedWiki,
    });
  } catch (error: any) {
    console.error('Generate wiki API error:', error);

    return NextResponse.json(
      { error: { message: error.message || 'Internal server error' } },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
