
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadImage(url: string): Promise<Buffer | null> {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data, 'binary');
    } catch (error: any) {
        console.error(`Failed to download ${url}: ${error.message}`);
        return null;
    }
}

async function uploadToSupabase(buffer: Buffer, filename: string): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from('event-images')
        .upload(`cached/${filename}`, buffer, {
            contentType: 'image/jpeg',
            upsert: true
        });

    if (error) {
        console.error(`Upload failed for ${filename}:`, error.message);
        return null;
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage.from('event-images').getPublicUrl(`cached/${filename}`);
    return publicUrl;
}

async function cacheImages() {
    console.log("Starting Image Caching Service...");

    // 1. Fetch events with external images and NO local_image_url
    const { data: events, error } = await supabase
        .from('events')
        .select('id, image_url, local_image_url')
        .not('image_url', 'is', null)
        .is('local_image_url', null)
        .limit(20); // Process in batches

    if (error) {
        console.error("DB Fetch Error:", error);
        return;
    }

    if (!events || events.length === 0) {
        console.log("No images pending cache.");
        return;
    }

    console.log(`Processing ${events.length} images...`);

    for (const event of events) {
        if (!event.image_url) continue;

        // Extract extension or default to jpg
        const ext = path.extname(event.image_url).split('?')[0] || '.jpg';
        const filename = `${event.id}_${Date.now()}${ext}`;

        console.log(`Downloading for Event ${event.id}: ${event.image_url}`);
        const buffer = await downloadImage(event.image_url);

        if (buffer) {
            const publicUrl = await uploadToSupabase(buffer, filename);
            if (publicUrl) {
                // Update Event
                const { error: updateErr } = await supabase
                    .from('events')
                    .update({ local_image_url: publicUrl })
                    .eq('id', event.id);

                if (!updateErr) console.log(`✅ Cached: ${publicUrl}`);
                else console.error(`❌ DB Update Failed: ${updateErr.message}`);
            }
        }
    }
    console.log("Batch complete.");
}

cacheImages();
