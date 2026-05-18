import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { describeTrackCharacteristics } from '@/lib/track-description';
import { verifyToken } from '@/lib/auth';
import { pitchRatelimit, checkRatelimit } from '@/lib/ratelimit';
import { INPUT_LIMITS, validateAllLengths } from '@/lib/validate-input';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const rl = await checkRatelimit(pitchRatelimit, `artist:${payload.artistId}`);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'RateLimitExceeded', message: rl.error, retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const { artist, curator, style, links, followers, userName, trackFeatures } = await request.json();

    if (!artist?.name || !artist?.genre) {
      return NextResponse.json({ error: 'Artist name and genre required' }, { status: 400 });
    }

    const lengthError = validateAllLengths([
      { value: artist.name, max: INPUT_LIMITS.ARTIST_NAME, name: 'アーティスト名' },
      { value: artist.genre, max: INPUT_LIMITS.GENRE, name: 'ジャンル' },
      { value: artist.description, max: INPUT_LIMITS.ARTIST_DESCRIPTION, name: '自己紹介' },
      { value: artist.influences, max: INPUT_LIMITS.ARTIST_INFLUENCES, name: '影響を受けたアーティスト' },
      { value: artist.achievements, max: INPUT_LIMITS.ARTIST_ACHIEVEMENTS, name: '実績' },
    ]);
    if (lengthError) {
      return NextResponse.json({ error: 'InputTooLong', message: lengthError }, { status: 413 });
    }

    // Build comprehensive prompt
    // NOTE: We deliberately do NOT pass the curator's actual name into the prompt.
    // The same generated pitch may be sent to multiple curators, so the AI must use
    // the literal placeholder "[Curator Name]" everywhere a name would appear; the
    // frontend (sendAll) substitutes the real name per recipient before sending.
    const curatorLines = [];
    if (curator) {
      curatorLines.push(`Platform: ${curator.platform || 'unknown'}`);
      curatorLines.push(`Type: ${curator.type || 'unknown'}`);
      if (curator.audience || curator.followers) {
        curatorLines.push(`Audience: ${(curator.audience ?? curator.followers).toLocaleString()}`);
      }
      if (curator.region) curatorLines.push(`Region: ${curator.region}`);
      if (curator.genres?.length) curatorLines.push(`Genres they champion: ${curator.genres.join(', ')}`);
      // similarArtists is canonical; preferredArtists is the legacy alias for
      // older curator records. Read both defensively.
      const similar = curator.similarArtists?.length ? curator.similarArtists : (curator.preferredArtists || []);
      if (similar.length) curatorLines.push(`Artists they have featured: ${similar.join(', ')}`);
      if (curator.preferredMoods?.length) curatorLines.push(`Moods they prefer: ${curator.preferredMoods.join(', ')}`);
      if (curator.opportunities?.length) curatorLines.push(`Opportunities they offer: ${curator.opportunities.join(', ')}`);
      if (curator.bio) {
        const bioTrimmed = curator.bio.trim().slice(0, 500);
        curatorLines.push(`Curator bio (may be in Japanese — extract meaning, NEVER quote raw Japanese):\n${bioTrimmed}`);
      }
    }
    const curatorInfo = curatorLines.length > 0 ? curatorLines.join('\n') : 'General music industry curator';
    const similarForCheck = curator?.similarArtists?.length ? curator.similarArtists : (curator?.preferredArtists || []);
    const hasCuratorPersonality = !!(curator?.bio || similarForCheck.length || curator?.preferredMoods?.length);

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
${hasCuratorPersonality ? `
═══ PERSONALIZATION (MANDATORY — DO NOT SKIP) ═══
The TARGET CURATOR section above contains real data about this specific curator. You MUST anchor the pitch to that data so it reads as researched, not templated. In the Hook OR Body, include AT LEAST ONE concrete reference drawn from:
  • a mood listed in "Moods they prefer" (e.g. "this leans into the kind of late-night warmth you tend to favor")
  • an artist in "Artists they have featured" (e.g. "fans of [ArtistX] in your rotation will find a familiar texture here")
  • a specific detail from the "Curator bio" (their stated focus, format, label, geography, philosophy)
A generic statement like "fits your playlist's vibe" does NOT satisfy this rule — the reference must point to a SPECIFIC item from the curator profile. NEVER name the curator personally (use [Curator Name] in the greeting only). NEVER quote raw Japanese from the bio.
` : ''}
═══ PITCH STRUCTURE (120-180 words) ═══
1. Subject line: Compelling, under 60 characters, include genre + "from Japan"
2. Greeting: "Hi [Curator Name]," — use the literal placeholder text "[Curator Name]" exactly as written. Do NOT substitute a real name. The system replaces this token per recipient before sending.
3. Hook: ${style === 'storytelling' ? 'Vivid sensory description of the sound' : style === 'casual' ? 'Personal connection to the curator\'s work' : 'Strongest credential or unique angle'}
4. Body: Describe the SOUND with vivid language. ${hasCuratorPersonality ? 'Weave in ONE specific reference to the curator profile above (a preferred mood, a similar artist they have featured, or a concrete detail from their bio) — this proves you researched them. Reference profile details abstractly, never name the curator. ' : ''}Reference achievements ONLY if in profile. ${socialLines.length > 0 ? 'Include social proof numbers naturally.' : ''}${trackDesc.characteristics ? ` Use the track analysis data above to give specific, concrete sound descriptions (e.g. energy level, tempo feel, mood).` : ''}
5. Listen link: Use the "Listen (Primary)" URL from the Links section below. Write it as "Listen: <url>" or "Stream: <url>". If no primary link, use the first available streaming link.
6. CTA: Clear ask appropriate for curator type (${curator?.type || 'blog'})
7. Links section: List all available platform links with follower counts
8. Sign-off: "${userName || 'OTONAMI Team'}" via OTONAMI

═══ ABSOLUTE RULES ═══
- NEVER write "I hope this email finds you well"
- NEVER invent achievements, numbers, or awards not in the profile
- NEVER use vague superlatives without evidence
- NEVER write a real curator name. ANYWHERE you would refer to the curator personally — greeting, hook, mid-sentence — use the literal text "[Curator Name]". The frontend substitutes this token per recipient. Writing a real name will cause every recipient of a multi-curator pitch to receive the wrong salutation.
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
