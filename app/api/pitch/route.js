import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { artist, curator, style, links, followers, userName } = await request.json();

    if (!artist?.name || !artist?.genre) {
      return NextResponse.json({ error: 'Artist name and genre required' }, { status: 400 });
    }

    // Build comprehensive prompt
    const curatorInfo = curator
      ? `Curator: ${curator.name} | Platform: ${curator.platform} | Type: ${curator.type} | Audience: ${curator.audience?.toLocaleString() || 'unknown'} | Genres: ${(curator.genres || []).join(', ')}`
      : 'General music industry curator';

    // Build social proof section
    const socialLines = [];
    if (followers?.spotify) socialLines.push(`${followers.spotify.toLocaleString()} monthly Spotify listeners`);
    if (followers?.youtube) socialLines.push(`${followers.youtube.toLocaleString()} YouTube subscribers`);
    if (followers?.instagram) socialLines.push(`${followers.instagram.toLocaleString()} Instagram followers`);
    if (followers?.twitter) socialLines.push(`${followers.twitter.toLocaleString()} X/Twitter followers`);
    if (followers?.facebook) socialLines.push(`${followers.facebook.toLocaleString()} Facebook followers`);
    if (followers?.soundcloud) socialLines.push(`${followers.soundcloud.toLocaleString()} SoundCloud followers`);

    const linkLines = [];
    if (links?.spotify) linkLines.push(`Spotify: ${links.spotify}`);
    if (links?.apple) linkLines.push(`Apple Music: ${links.apple}`);
    if (links?.youtube) linkLines.push(`YouTube: ${links.youtube}`);
    if (links?.soundcloud) linkLines.push(`SoundCloud: ${links.soundcloud}`);
    if (links?.instagram) linkLines.push(`Instagram: ${links.instagram}`);
    if (links?.twitter) linkLines.push(`X: ${links.twitter}`);
    if (links?.website) linkLines.push(`Website: ${links.website}`);

    const prompt = `You are an expert music publicist who has successfully pitched hundreds of Japanese artists to international curators, playlist editors, bloggers, and radio hosts. You understand what makes curators open emails, click play, and add tracks.

═══ TASK ═══
Write a pitch email + EPK bio for the artist below. Every claim MUST come from the provided profile. NEVER invent stats, awards, or achievements not listed.

═══ ARTIST PROFILE ═══
Name: ${artist.nameEn || artist.name}
Japanese Name: ${artist.name}
Genre: ${artist.genre}
Mood/Sound: ${artist.mood || 'N/A'}
Description: ${artist.description || 'N/A'}
Key Track: ${artist.songTitle || 'N/A'}
Influences/Similar: ${artist.influences || 'N/A'}
Achievements: ${artist.achievements || 'None listed'}
${socialLines.length > 0 ? `Social Proof: ${socialLines.join(', ')}` : ''}
${linkLines.length > 0 ? `Links:\n${linkLines.join('\n')}` : ''}

═══ TARGET CURATOR ═══
${curatorInfo}

═══ STYLE: ${style?.toUpperCase() || 'PROFESSIONAL'} ═══
${style === 'casual' ? 'Warm, personal tone — like messaging a fellow music fan who happens to have influence. Genuine, not corporate. Use contractions.' : style === 'storytelling' ? 'Open with a vivid, sensory description of the music — what it sounds like, what it evokes. Paint a picture before the pitch. Make the curator feel the music through words.' : 'Polished, industry-standard tone. Concise. Lead with strongest credential. Respect the curator\'s time.'}

═══ PITCH STRUCTURE (120-180 words) ═══
1. Subject line: Compelling, under 60 characters, include genre + "from Japan"
2. Greeting: "Hi ${curator?.name || '[Curator Name]'},"
3. Hook: ${style === 'storytelling' ? 'Vivid sensory description of the sound' : style === 'casual' ? 'Personal connection to curator\'s work' : 'Strongest credential or unique angle'}
4. Body: Describe the SOUND with vivid language. Reference achievements ONLY if in profile. ${socialLines.length > 0 ? 'Include social proof numbers naturally.' : ''}
5. Listen link: Include the primary streaming link
6. CTA: Clear ask appropriate for curator type (${curator?.type || 'blog'})
7. Links section: List all available platform links with follower counts
8. Sign-off: "${userName || 'OTONAMI Team'}" via OTONAMI

═══ ABSOLUTE RULES ═══
- NEVER write "I hope this email finds you well"
- NEVER invent achievements, numbers, or awards not in the profile
- NEVER use vague superlatives without evidence
- ALL text must be in English (translate Japanese content naturally)
- Keep pitch body under 180 words
- ${socialLines.length > 0 ? 'DO include follower/listener counts as social proof — curators use these numbers to evaluate potential' : 'Do NOT invent follower counts'}

═══ EPK BIO (after "---EPK---") ═══
Write a 100-120 word professional bio in third person. Lead with strongest credential. Include all social links with follower counts.

═══ OUTPUT FORMAT ═══
Start with "Subject: " line. Then the pitch. Then "---EPK---" separator. Then the EPK bio. Nothing else.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    // Split pitch and EPK
    const parts = text.split('---EPK---');
    const pitch = (parts[0] || '').trim();
    const epk = (parts[1] || '').trim();

    return NextResponse.json({
      pitch,
      epk,
      usage: message.usage,
    });
  } catch (error) {
    console.error('Pitch generation error:', error);
    return NextResponse.json(
      { error: 'Pitch generation failed', detail: error.message },
      { status: 500 }
    );
  }
}
