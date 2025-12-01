import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  console.log('[API Route] Extract actions request received');

  try {
    const body = await request.json();
    const { transcript } = body;

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

    const prompt = `Analyze the following meeting transcript and extract all action items. Return ONLY valid JSON with no additional text.

The JSON structure must be:
{
  "actionItems": [
    {
      "task": "Description of the task",
      "owner": "Person responsible (or null if not specified)",
      "deadline": "Due date if mentioned (or null)",
      "priority": "high" | "medium" | "low",
      "context": "Brief context about why this task was created"
    }
  ]
}

Priority guidelines:
- "urgent", "ASAP", "critical", "immediately" = high
- "soon", "next week", "this sprint" = medium
- Others or unspecified = low

Be thorough - extract every task, commitment, follow-up, or action mentioned.

Transcript:
${transcript}

JSON:`;

    console.log('[API Route] Calling OpenAI API for action extraction...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting action items from meeting transcripts. Always respond with valid JSON only.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    console.log('[API Route] OpenAI response received');

    // Parse the JSON response
    let actionItems = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        actionItems = parsed.actionItems || [];
      }
    } catch (parseError) {
      console.error('[API Route] Failed to parse action items JSON:', parseError);
      return NextResponse.json(
        { error: { message: 'Failed to parse action items response' } },
        { status: 500 }
      );
    }

    // Enrich with IDs
    const enrichedItems = actionItems.map((item: any, index: number) => ({
      id: `action-${Date.now()}-${index}`,
      task: item.task || '',
      owner: item.owner || null,
      deadline: item.deadline || null,
      priority: item.priority || 'medium',
      context: item.context || null,
      completed: false,
    }));

    return NextResponse.json({
      actionItems: enrichedItems,
    });
  } catch (error: any) {
    console.error('Extract actions API error:', error);

    return NextResponse.json(
      { error: { message: error.message || 'Internal server error' } },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
