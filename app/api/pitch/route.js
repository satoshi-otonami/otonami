import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { describeTrackCharacteristics } from '@/lib/track-description';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(request) {
  try {
    const { artist, curator, style, links, followers, userName, trackFeatures } = await request.json();

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
    // songLink is the primary pitch track URL — always listed first as the listen link
    if (links?.songLink) linkLines.push(`Listen (Primary): ${links.songLink}`);
    if (links?.spotify) linkLines.push(`Spotify: ${links.spotify}`);
    if (links?.apple) linkLines.push(`Apple Music: ${links.apple}`);
    if (links?.youtube) linkLines.push(`YouTube: ${links.youtube}`);
    if (links?.soundcloud) linkLines.push(`SoundCloud: ${links.soundcloud}`);
    if (links?.instagram) linkLines.push(`Instagram: ${links.instagram}`);
    if (links?.twitter) linkLines.push(`X: ${links.twitter}`);
    if (links?.website) linkLines.push(`Website: ${links.website}`);

    // Build audio features section if data is available
    const trackDesc = describeTrackCharacteristics(trackFeatures);
    const rawScores = trackFeatures ? [
      trackFeatures.tempo ? `Tempo: ${Math.round(trackFeatures.tempo)} BPM` : null,
      trackFeatures.energy != null ? `Energy: ${Math.round(trackFeatures.energy * 100)}/100` : null,
      trackFeatures.danceability != null ? `Groove/Danceability: ${Math.round(trackFeatures.danceability * 100)}/100` : null,
      trackFeatures.acousticness != null ? `Acousticness: ${Math.round(trackFeatures.acousticness * 100)}/100` : null,
      trackFeatures.valence != null ? `Mood/Valence: ${Math.round(trackFeatures.valence * 100)}/100` : null,
      trackFeatures.instrumentalness != null ? `Instrumentalness: ${Math.round(trackFeatures.instrumentalness * 100)}/100` : null,
      trackFeatures.chill != null ? `Chill: ${Math.round(trackFeatures.chill * 100)}/100` : null,
      trackFeatures.hype != null ? `Hype: ${Math.round(trackFeatures.hype * 100)}/100` : null,
      trackFeatures.groove != null ? `Groove: ${Math.round(trackFeatures.groove * 100)}/100` : null,
      trackFeatures.aggressive != null ? `Aggressive: ${Math.round(trackFeatures.aggressive * 100)}/100` : null,
      trackFeatures.genres?.length > 0 ? `Detected Genres: ${trackFeatures.genres.join(', ')}` : null,
      trackFeatures.note && trackFeatures.mode ? `Key: ${trackFeatures.note} ${trackFeatures.mode}` : null,
    ].filter(Boolean).join('\n') : '';
    const audioSection = trackDesc.characteristics ? `
═══ TRACK ANALYSIS DATA ═══
Musical characteristics: ${trackDesc.characteristics}
${trackDesc.genreText ? trackDesc.genreText : ''}
${trackDesc.moodText ? trackDesc.moodText : ''}
${rawScores ? `\nRaw scores:\n${rawScores}` : ''}

IMPORTANT: Use these audio characteristics to write vivid, specific descriptions of the track's sound.
Translate the numbers into evocative musical language — do NOT list them as data points.
For example: Energy 65 + Groove 61 → "moderately energetic groove"; Acousticness 68 → "rich acoustic textures".
If Detected Genres are available, weave them naturally into the pitch.
` : '';

    const prompt = `You are an expert music publicist who has successfully pitched hundreds of Japanese artists to international curators, playlist editors, bloggers, and radio hosts. You understand what makes curators open emails, click play, and add tracks.

═══ TASK ═══
Write a pitch email + EPK bio for the artist below. Every claim MUST come from the provided profile. NEVER invent stats, awards, or achievements not listed.

═══ ARTIST PROFILE ═══
Name: ${artist.nameEn || artist.name}
Japanese Name: ${artist.name}
Genre: ${artist.genre}
Mood/Sound: ${artist.mood || 'N/A'}
Description (may be in Japanese — extract meaning, NEVER quote raw Japanese): ${artist.description || 'N/A'}
Key Track: ${artist.songTitle || 'N/A'}
Influences/Similar: ${artist.influences || 'N/A'}
Achievements: ${artist.achievements || 'None listed'}
${socialLines.length > 0 ? `Social Proof: ${socialLines.join(', ')}` : ''}
${linkLines.length > 0 ? `Links:\n${linkLines.join('\n')}` : ''}
${audioSection}

═══ TARGET CURATOR ═══
${curatorInfo}

═══ STYLE: ${style?.toUpperCase() || 'PROFESSIONAL'} ═══
${style === 'casual' ? 'Warm, personal tone — like messaging a fellow music fan who happens to have influence. Genuine, not corporate. Use contractions.' : style === 'storytelling' ? 'Open with a vivid, sensory description of the music — what it sounds like, what it evokes. Paint a picture before the pitch. Make the curator feel the music through words.' : 'Polished, industry-standard tone. Concise. Lead with strongest credential. Respect the curator\'s time.'}

═══ PITCH STRUCTURE (120-180 words) ═══
1. Subject line: Compelling, under 60 characters, include genre + "from Japan"
2. Greeting: "Hi ${curator?.name || '[Curator Name]'},"
3. Hook: ${style === 'storytelling' ? 'Vivid sensory description of the sound' : style === 'casual' ? 'Personal connection to curator\'s work' : 'Strongest credential or unique angle'}
4. Body: Describe the SOUND with vivid language. Reference achievements ONLY if in profile. ${socialLines.length > 0 ? 'Include social proof numbers naturally.' : ''}${trackDesc.characteristics ? ` Use the track analysis data above to give specific, concrete sound descriptions (e.g. energy level, tempo feel, mood).` : ''}
5. Listen link: Use the "Listen (Primary)" URL from the Links section below. Write it as "Listen: <url>" or "Stream: <url>". If no primary link, use the first available streaming link.
6. CTA: Clear ask appropriate for curator type (${curator?.type || 'blog'})
7. Links section: List all available platform links with follower counts
8. Sign-off: "${userName || 'OTONAMI Team'}" via OTONAMI

═══ ABSOLUTE RULES ═══
- NEVER write "I hope this email finds you well"
- NEVER invent achievements, numbers, or awards not in the profile
- NEVER use vague superlatives without evidence
- ALL output text must be 100% English. ZERO Japanese characters allowed in the pitch or EPK.
- If the artist description/bio is in Japanese, translate the MEANING into natural English. NEVER include the original Japanese text, not even in parentheses like "(楽しいバンドです)".
- Do NOT put romanized Japanese or Japanese text in quotes, parentheses, or inline translations.
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

    // Strip any Japanese text in parentheses that may have leaked through
    const stripJapaneseParens = (s) =>
      s.replace(/\s*[（(][^）)]*[ぁ-んァ-ヶー一-龠][^）)]*[）)]/g, '');

    // Split pitch and EPK
    const parts = text.split('---EPK---');
    const pitch = stripJapaneseParens((parts[0] || '').trim());
    const epk = stripJapaneseParens((parts[1] || '').trim());

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
