
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { Event } from './scrapers/types.js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const geminiKey = process.env.GEMINI_API_KEY || '';

if (!supabaseUrl || !supabaseKey || !geminiKey) {
    console.error('Missing credentials (SUPABASE or GEMINI_API_KEY).');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

async function enrichEvents() {
    console.log('Starting AI Enrichment...');

    // 1. Fetch unprocessed events (limit 10 at a time to avoid rate limits)
    // We check for is_ai_processed is false or null
    const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .or('is_ai_processed.is.null,is_ai_processed.eq.false')
        .not('description', 'is', null) // Must have description
        .limit(5); // Process small batch for safer testing

    if (error) {
        console.error('Error fetching events:', error);
        return;
    }

    if (!events || events.length === 0) {
        console.log('No unprocessed events found.');
        return;
    }

    console.log(`Found ${events.length} events to process.`);

    for (const event of events) {
        try {
            console.log(`Processing: ${event.title}`);

            const prompt = `
        Analyze the following event details and extract structured information.
        
        Event Title: ${event.title}
        Venue: ${event.venue_name}
        Description: ${event.description}
        Rules: ${Array.isArray(event.rules) ? event.rules.join('\n') : event.rules}

        Output strictly valid JSON with the following fields:
        1. summary: A catchy, one-sentence summary for a card view (max 15 words).
        2. mood: ONE string from this list that best matches: ["Kopmalık 🎸", "Chill & Sanat 🎨", "Date Night 🍷", "Ailece 👨‍👩‍👧‍👦", "Kendini Geliştir 🧠", "Spor & Aktivite ⚽"]. If none fit perfectly, pick the closest.
        3. tags: An array of 3-5 short keywords/tags (e.g. "Rock", "Festival", "Atölye", "Stand-up").

        Example JSON:
        {
          "summary": "Enerjik bir rock konseriyle unutulmaz bir geceye hazır olun.",
          "mood": "Kopmalık 🎸",
          "tags": ["Rock", "Konser", "Canlı Müzik"]
        }
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            // Clean markdown code blocks if present
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            const json = JSON.parse(text);

            if (json.summary && json.mood) {
                // Update DB
                const { error: updateErr } = await supabase
                    .from('events')
                    .update({
                        summary: json.summary,
                        ai_mood: json.mood,
                        ai_tags: json.tags || [],
                        is_ai_processed: true
                    })
                    .eq('id', event.id);

                if (updateErr) console.error(`Failed to update ${event.title}:`, updateErr);
                else console.log(`Enriched ${event.title}: [${json.mood}] ${json.summary}`);
            } else {
                console.warn(`Invalid JSON from AI for ${event.title}`);
            }

            // Rate limiting / Throttling
            await new Promise(r => setTimeout(r, 2000));

        } catch (e) {
            console.error(`Error processing ${event.title}:`, e);
            // Mark as processed (or separate error state) to avoid stuck loop? 
            // For now, leave it so we retry, but maybe log failure count.
        }
    }
}

enrichEvents();
