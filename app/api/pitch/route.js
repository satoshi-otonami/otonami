import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { describeTrackCharacteristics } from '@/lib/track-description';
import { verifyToken } from '@/lib/auth';
import { pitchRatelimit, checkRatelimit } from '@/lib/ratelimit';
import { INPUT_LIMITS, validateAllLengths } from '@/lib/validate-input';
import { getServiceSupabase } from '@/lib/supabase';

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

    // ── Description tone detection ──
    // Soft prompt rules ("authoritative for tone") were getting overridden by
    // curator preferred-mood matching at temperature 1.0. Detect the dominant
    // emotional vector in the artist's own description and BOTH bio sources
    // server-side, then emit a hard FORBIDDEN/REQUIRED adjective list so the
    // AI cannot rationalize a contradicting tone.
    const toneSource = ((artist.description || '') + '\n' + (artist.mood || '')).toLowerCase();
    const POSITIVE_PATTERNS = /happy|happiness|joy|joyful|joyous|uplift|cheerful|fun|smile|bright|warm|feel.?good|optimis|sunny|playful|嬉し|うれし|楽し|たのし|ハッピー|幸せ|しあわせ|笑顔|明る|喜び|よろこび|元気|げんき|わくわく|ワクワク|ポジティブ|前向き/;
    const SOMBER_PATTERNS = /melanchol|sad|sorrow|grief|brooding|somber|mournful|dark|gloom|寂し|さみし|悲し|かなし|暗い|くらい|憂鬱|ゆううつ|内省|メランコリ|シリアス/;
    const isPositive = POSITIVE_PATTERNS.test(toneSource);
    const isSomber = SOMBER_PATTERNS.test(toneSource);
    // Only enforce when the artist's tone is unambiguous AND the curator's
    // preferred mood would push the AI in the opposite direction.
    const curatorMoodsLower = (curator?.preferredMoods || []).join(' ').toLowerCase();
    const curatorWantsSomber = /melanchol|sad|dark|brooding|introspective|reflective|contemplative/.test(curatorMoodsLower);
    const curatorWantsPositive = /happy|joy|upbeat|cheerful|uplifting|energetic|bright/.test(curatorMoodsLower);
    let toneOverride = '';
    if (isPositive && (curatorWantsSomber || !curatorWantsPositive)) {
      toneOverride = `
═══ TONE LOCK (HIGHEST PRIORITY — OVERRIDES ALL OTHER RULES) ═══
The artist's Description explicitly states the song is positive/joyful/happy. The pitch tone is locked to that emotion.

FORBIDDEN — these words MUST NOT appear anywhere in the pitch or EPK (not even as "balanced with X" or "undertones of X"):
  melancholic, melancholy, melancholia, brooding, somber, sad, sorrowful, mournful, dark, gloomy, introspective, introspection, contemplative, contemplation, reflective, reflection, pensive, wistful, bittersweet

REQUIRED — use words like these to carry the song's character (pick what fits naturally):
  joyful, uplifting, warm, bright, cheerful, sunny, playful, optimistic, feel-good, life-affirming, radiant, buoyant, exuberant

If the curator's profile says they prefer "Melancholic" or similar, that preference is IGNORED for tone. The artist's truth wins. You may still use the curator's similar-artists or bio focus as your personalization anchor, but NEVER reframe the song as melancholic/reflective/contemplative to flatter the curator.
`;
    } else if (isSomber && curatorWantsPositive) {
      toneOverride = `
═══ TONE LOCK (HIGHEST PRIORITY — OVERRIDES ALL OTHER RULES) ═══
The artist's Description states the song is somber/melancholic/reflective. Do NOT describe it as "uplifting", "happy", "cheerful", or "feel-good" just because the curator's profile prefers those moods. The artist's truth wins.
`;
    }

    // The pitch creation form stores a per-pitch description in localStorage,
    // but the canonical artist profile bio lives in `artists.bio` (written via
    // the artist profile page). These are NOT synced on the frontend, so we
    // fetch the DB bio here and merge it into the prompt — without this, a
    // user with a rich SXSW/Ghibli-grade bio in their profile sees a generic
    // pitch because only the empty pitch-form description reaches Claude.
    let artistDbBio = null;
    let artistDbHotNews = null;
    let artistDbInfluences = null;
    try {
      const sb = getServiceSupabase();
      const { data: artistRow } = await sb
        .from('artists')
        .select('bio, hot_news, influences')
        .eq('id', payload.artistId)
        .maybeSingle();
      if (artistRow) {
        artistDbBio = artistRow.bio?.trim() || null;
        artistDbHotNews = artistRow.hot_news?.trim() || null;
        artistDbInfluences = Array.isArray(artistRow.influences) && artistRow.influences.length
          ? artistRow.influences.join(', ')
          : null;
      }
    } catch (e) {
      console.warn('Pitch: artist bio fetch failed:', e.message);
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
    // Strip valence-driven mood phrases that would directly contradict the
    // artist's stated tone. lib/track-description.js emits literal phrases
    // like "introspective and melancholic" for mid-range valence; when
    // TONE LOCK is active (artist says happy) these leak straight into
    // the AI prompt as "facts" and override our forbidden-word rule.
    const scrubTone = (s) => {
      if (!s || !(isPositive && (curatorWantsSomber || !curatorWantsPositive))) return s;
      return s
        .replace(/introspective and melancholic/gi, 'melodically rich')
        .replace(/dark and moody/gi, 'expressive and dynamic')
        .replace(/balanced between light and dark tones/gi, 'with broad emotional range')
        .replace(/\b(melancholic|melancholy|brooding|somber|introspective|contemplative|reflective|pensive|wistful)\b/gi, 'expressive');
    };
    const audioSection = trackDesc.characteristics ? `
═══ TRACK ANALYSIS DATA ═══
Musical characteristics: ${scrubTone(trackDesc.characteristics)}
${trackDesc.genreText ? trackDesc.genreText : ''}
${scrubTone(trackDesc.moodText || '')}
${rawScores ? `\nRaw scores:\n${rawScores}` : ''}

IMPORTANT: Use these audio characteristics to write vivid, specific descriptions of the track's sound.
Translate the numbers into evocative musical language — do NOT list them as data points.
For example: Energy 65 + Groove 61 → "moderately energetic groove"; Acousticness 68 → "rich acoustic textures".
If Detected Genres are available, weave them naturally into the pitch.
${isPositive && (curatorWantsSomber || !curatorWantsPositive) ? 'NOTE: The artist\'s Description states the song is positive/joyful. Even if the raw valence score is moderate, you MUST describe the sound in positive terms (warm, uplifting, bright, joyful). Do NOT translate raw scores into melancholic/introspective/contemplative wording.' : ''}
` : '';

    const prompt = `You are helping the artist ${artist.nameEn || artist.name} write a personal pitch email to a music curator, in the artist's own first-person voice. Write AS the artist — not as a PR agency, not as a label, not as a third-party introducer. You understand what makes curators open emails, click play, and add tracks. The output goes straight into the email body, and the artist's own signature is appended afterward.

═══ MANDATORY PERSPECTIVE RULES (HIGHEST PRIORITY — OVERRIDES ALL STYLE GUIDANCE) ═══

1. Write the PITCH in the FIRST PERSON, as if the artist themselves is writing to the curator.
2. Use "I", "me", "my" for a solo artist; use "we", "our", "us" for a band/group/duo/collective (judge from the profile).
3. NEVER refer to the artist in the third person. Do NOT use "he", "she", "his", "her", "they" (when it means the artist), "the artist", "this artist", "${artist.nameEn || artist.name}'s track/sound", or any phrasing that introduces the artist as a third party.
4. The pitch ends with the artist's own signature, so the body MUST read as the artist speaking directly.
5. CORRECT opening style: "Hi [Curator Name], I'm reaching out from Japan to share my new track…"
6. INCORRECT — never write like this: "I wanted to introduce you to ${artist.nameEn || artist.name}, whose new track…" / "His track reached…" / "Their sound blends…" / "${artist.nameEn || artist.name} is a Japanese artist who…"
7. This rule governs the PITCH body only. The EPK bio (after "---EPK---") stays in third person, as is standard for a press-kit bio.
8. The artist's achievements (provided in the ARTIST PROFILE below) describe the ARTIST/band's overall career — past performances, awards, total streams across their catalog. Do NOT attribute these to the specific track being pitched unless the achievement explicitly names this track.

═══ CRITICAL ANTI-HALLUCINATION RULES (HIGHEST PRIORITY — OVERRIDES ALL OTHER INSTRUCTIONS) ═══

The single biggest failure mode of music-pitch AI is inventing curator credentials. This is forbidden.

1. NEVER invent, infer, guess, or assume any information about the curator that is not EXPLICITLY listed in the TARGET CURATOR section below. The TARGET CURATOR section is the ONLY source of truth about the curator.

2. The following are STRICTLY FORBIDDEN unless the exact words appear verbatim in the curator's bio (the lines labeled "Curator bio:" inside TARGET CURATOR):
   • Claiming the curator works/worked at any specific company (Sony, Universal, Warner, Spotify, Apple, etc.)
   • Claiming the curator leads, runs, founded, or is secretary of any organization (ILCJ, label, agency, council, association, etc.)
   • Claiming the curator has any specific job title or role beyond what's in their profile
   • Attributing any past achievements, awards, credentials, or career milestones to the curator
   • Naming any specific artists, albums, releases, or projects the curator has personally worked on
   • Implying the curator has industry connections, international experience, or expertise not stated in their bio
   • Phrases like "Your work with X", "your role at Y", "your experience leading Z" are FORBIDDEN unless X/Y/Z are verbatim in the curator's bio

3. ARTIST CREDENTIALS BELONG TO THE ARTIST, NOT THE CURATOR. The ARTIST PROFILE section below lists the artist's bio, achievements, label, influences. NEVER attribute any of those to the curator. If you see "ROUTE14band's bio mentions Sony Music" — that belongs to the BAND, not to the person you're emailing. The curator is a stranger receiving an email; assume they have only the credentials in TARGET CURATOR and nothing more.

4. WHEN THE CURATOR BIO IS EMPTY OR THIN: Personalize by genre alignment or playlist focus ONLY ("a fit for your [genre listed] rotation", "the kind of [mood listed] you tend to feature"). Do NOT invent background to fill the gap. A pitch with no curator-specific reference is better than a pitch with a fabricated reference.

5. SELF-CHECK BEFORE OUTPUT: For every claim you make about the curator, ask "Is this in the TARGET CURATOR section verbatim?" If NO → delete the claim. Paraphrasing curator background = inventing it. Only use what's explicitly stated.

A pitch that fabricates "Your work with Sony Music" / "your role at ILCJ" / "leading X labels" is a CRITICAL FAILURE that damages the platform's credibility. Better to write a pitch with zero curator-specific lines than to invent one.

${toneOverride}
═══ TASK ═══
Write a pitch email + EPK bio for the artist below. Every claim MUST come from the provided profile. NEVER invent stats, awards, or achievements not listed.

═══ ARTIST PROFILE ═══
Name: ${artist.nameEn || artist.name}
Japanese Name: ${artist.name}
Genre: ${artist.genre}
Mood/Sound: ${artist.mood || 'N/A'}
${artist.description ? `Description — THE ARTIST'S OWN PITCH MESSAGE FOR THIS SUBMISSION (PRIMARY SOURCE — every concrete fact, number, award, ambition, and personal tone here MUST appear in the pitch body. This supersedes Bio when in conflict. May be in Japanese — extract meaning, NEVER quote raw Japanese):\n${artist.description}\n` : (artistDbBio ? '' : 'Description: N/A')}${artistDbBio ? `Artist Bio — supporting context from the artist's profile (use for additional credibility ONLY when it doesn't crowd out the Description above. May be in Japanese — extract meaning, NEVER quote raw Japanese):\n${artistDbBio}\n` : ''}
Key Track: ${artist.songTitle || 'N/A'}
Influences/Similar: ${artist.influences || artistDbInfluences || 'N/A'}
Achievements — the ARTIST/band's own career achievements & stats. These belong to the ARTIST/band, NOT to this specific track.
Attribute as "I/we have…", "We've performed…", "Our band has…" — NEVER as "this track has…", "the track reached…", "this song features…".
The only exception is if the achievement explicitly names this track (e.g., "this single charted #5 in Japan"), in which case track attribution is fine.
${artist.achievements || 'None listed'}
${artistDbHotNews ? `Latest Activity: ${artistDbHotNews}` : ''}
${socialLines.length > 0 ? `Social Proof: ${socialLines.join(', ')}` : ''}
${linkLines.length > 0 ? `Links:\n${linkLines.join('\n')}` : ''}
${audioSection}

═══ TARGET CURATOR ═══
${curatorInfo}

═══ STYLE: ${style?.toUpperCase() || 'PROFESSIONAL'} ═══
${style === 'casual' ? 'Warm, personal tone — like messaging a fellow music fan who happens to have influence. Genuine, not corporate. Use contractions.' : style === 'storytelling' ? 'Open with a vivid, sensory description of the music — what it sounds like, what it evokes. Paint a picture before the pitch. Make the curator feel the music through words.' : 'Polished, industry-standard tone. Concise. Lead with strongest credential. Respect the curator\'s time.'}
${(artist.description || artistDbBio) ? `
═══ ARTIST NARRATIVE (MANDATORY — DO NOT SKIP) ═══
The artist has provided two sources of self-introduction:
  • "Description" — THE ARTIST'S ACTUAL PITCH MESSAGE for this submission. This is what they personally chose to say to the curator. IT IS THE PRIMARY SOURCE for both tone and facts.
  • "Artist Bio" — supporting profile context, used only as backup for additional credibility.

You MUST do ALL of the following:

1. THE DESCRIPTION IS AUTHORITATIVE FOR BOTH TONE AND FACTS. Every concrete fact, number, award, ambition, festival/venue name, or personal claim in the Description MUST appear in the pitch body. Examples — if the Description says any of these, they MUST be in the pitch body, naturally phrased in English:
   • "グラミー賞も狙っています" / "aiming for the Grammy" → MUST appear (e.g. "with Grammy ambitions" / "currently aiming for the Grammys")
   • "SXSW 10回出演" / "10 SXSW appearances" → MUST appear as a specific number
   • "日本を代表するインストバンド" / "leading Japanese instrumental band" → MUST appear as a positioning claim
   • "月間50万再生" / "500K monthly streams" → MUST appear verbatim as a number
   You are FORBIDDEN from omitting any specific fact the artist wrote in the Description. Generic phrasing that "covers" the fact without naming it does NOT satisfy this rule — if they said "Grammy", the pitch must say "Grammy"; if they said "10 times", the pitch must say "10 times" (or "ten times").

2. THE DESCRIPTION IS AUTHORITATIVE FOR TONE AND SONG CHARACTER. If the artist wrote that the song is "happy", "joyful", "uplifting", or "makes people feel good", the pitch body MUST convey that emotional truth. You are FORBIDDEN from describing the song with contradicting adjectives (do NOT call a "happy" song "melancholic", "dark", "brooding", or "introspective" just because the curator's preferred moods include those words). The artist's stated intent for the song wins over the curator's mood preferences. Period.

3. ECHO THE DESCRIPTION'S PERSONAL VOICE AND OPENING. If the Description contains a personal greeting or warm opener from the artist (e.g. "お元気ですか？" / "how are you?" / "hi, I think you'll enjoy this"), reflect that warmth in the BODY's opening sentence (NOT the greeting line — the "Hi [Curator Name]," line stays as the literal placeholder). The first sentence of the body should feel like the artist is personally addressing the curator, not a publicist's third-person dump. The artist's name/identity belongs in the sign-off.

4. WHEN DESCRIPTION AND BIO OVERLAP, FOLLOW THE DESCRIPTION. If the Description says "SXSW 10 appearances" and the Bio says "SXSW 8 appearances since 2013", use the Description's number (10) and you may add the Bio's year (2013) as supporting detail — but never override a Description fact with a Bio fact.

5. USE THE BIO FOR SUPPORTING DETAIL ONLY. The Bio supplies extra context (formation year, member names, signature concept) when the Description doesn't already cover it. Do NOT let the Bio's narrative voice dominate when the Description has its own message. If the Description carries the lead, the Bio is a supporting paragraph at most.

6. NEVER REFRAME THE ARTIST'S MUSIC TO FLATTER THE CURATOR. If the curator's preferred mood does not match the Description's stated tone, do NOT invent a fake bridge ("this melancholic track will fit your melancholic playlist" when the artist said the song is joyful). You may acknowledge the curator's taste only when the song genuinely aligns.

If the text is in Japanese, translate the meaning into natural English; never quote the raw Japanese.

═══ VOICE PRESERVATION (CRITICAL — DO NOT SOFTEN) ═══
The Description reflects the artist's actual voice and ambition. When incorporating it into the pitch:

1. PRESERVE VERB STRENGTH — Match the original intensity. Bold claims stay bold:
   • "狙っています" / "aiming for" → "aiming for" / "going after" / "have our sights set on" / "we're after"
     ✗ NOT "seeking recognition" / "hoping for" / "setting our sights on … recognition" / "pursuing acknowledgement"
   • "ハッピーになる" / "make you happy" → "make you happy" / "bring joy" / "puts a smile on your face"
     ✗ NOT "uplifting" / "pleasant" / "feel-good experience"
   • "ぜひ" / "definitely" / "please" → "would love" / "please" / "I'd really love"
     ✗ NOT omit it entirely

2. PRESERVE GREETINGS — If the artist opens with a personal greeting like "お元気ですか?" / "How are you?" / "Hope you're doing well", KEEP that warmth in the pitch body's opening sentence. Do NOT skip it in favor of a "professional" opener. A casual "Hope you're doing well!" or "How are you?" at the start of the body is REQUIRED if the artist wrote one.

3. PRESERVE INVITATIONS — If the artist writes "ぜひ聞いてみてください" / "please give it a listen" / "I'd love for you to hear it", keep that direct invitation. Do NOT replace it with a generic "consider for your playlist". Use the direct second-person ask the artist wrote.

4. NO SOFTENING OF AMBITION — If the artist says they're going after a Grammy, the English pitch must say "aiming for a Grammy" or stronger. "Seeking recognition" / "hoping for acknowledgement" / "pursuing" are FORBIDDEN substitutions because they reframe ambition as passive wish.

5. NO FORMALIZATION OF CASUAL TONE — If the artist's intro is casual and warm (greeting + casual invitation), the pitch opening should feel casual and warm. Don't formalize. "Hi! Hope you're doing well!" type openers are perfectly professional for indie music pitching — formality is NOT what makes a pitch professional, specificity and authenticity do.

6. THE PITCH IS THE ARTIST'S VOICE THROUGH A TRANSLATOR, NOT A PR REWRITE. You are translating + arranging the artist's own words, not rewriting them in your own publicist voice. When in doubt, stay closer to what the artist literally said.
` : ''}${hasCuratorPersonality ? `
═══ CURATOR PERSONALIZATION (MANDATORY — DO NOT SKIP) ═══
The TARGET CURATOR section above contains real data about this specific curator. You MUST anchor the pitch to that data so it reads as researched, not templated. In the Hook OR Body, include AT LEAST ONE concrete reference drawn from:
  • an artist in "Artists they have featured" (e.g. "fans of [ArtistX] in your rotation will find a familiar texture here")
  • a specific detail from the "Curator bio" (their stated focus, format, label, geography, philosophy) — QUOTE OR DIRECTLY PARAPHRASE the bio's actual words; do NOT extrapolate to credentials/companies/roles not mentioned
  • a mood listed in "Moods they prefer" — BUT ONLY IF that mood is genuinely compatible with the song character described in the Description. If there is a mood mismatch, choose one of the other two anchors instead.
A generic statement like "fits your playlist's vibe" does NOT satisfy this rule. NEVER name the curator personally (use [Curator Name] in the greeting only). NEVER quote raw Japanese from the bio.

REMINDER: The ANTI-HALLUCINATION rules at the top of this prompt take precedence. If the curator profile is too thin for a researched reference, fall back to genre-alignment language ("a natural fit for your [genre] rotation") — do NOT invent a fabricated background to satisfy this personalization requirement. Personalization with FABRICATED detail is worse than no personalization.
` : ''}
═══ PITCH STRUCTURE (120-180 words) ═══
1. Subject line: Compelling, under 60 characters, include genre + "from Japan"
2. Greeting: "Hi [Curator Name]," — use the literal placeholder text "[Curator Name]" exactly as written. Do NOT substitute a real name. The system replaces this token per recipient before sending.
3. Hook: ${style === 'storytelling' ? 'Vivid sensory description of the sound' : style === 'casual' ? 'Personal connection to the curator\'s work' : 'Strongest credential or unique angle'}
4. Body: FIRST sentence should echo the Description's personal voice/opener if it has one (see ARTIST NARRATIVE rule 3). Then weave in EVERY specific fact, number, award, and ambition from the Description (see ARTIST NARRATIVE rule 1) — these are non-negotiable. Describe the SOUND in vivid language that MATCHES the Description's stated tone. Reference achievements ONLY if in profile. ${socialLines.length > 0 ? 'Include social proof numbers naturally.' : ''}${trackDesc.characteristics ? ` Use the track analysis data above to give specific sound descriptions (e.g. energy level, tempo feel) — but defer to the Description's stated mood if the analysis appears to contradict it.` : ''}
5. CTA — MANDATORY CLOSING INVITATION: The pitch body MUST end with a direct, warm invitation to the curator to actually listen. This is NOT optional. Choose phrasing that matches the artist's Description tone:
   • If the Description contains "ぜひ聞いてください" / "ぜひ聞いてみてください" / "please listen" / "I'd love for you to hear" → end with "Would love for you to give it a listen." / "I'd really love for you to hear it." / "Please give it a listen — it would mean a lot."
   • If the Description points at specific listening cues (e.g. "ぜひメンバーのソロを聞いてください") → echo it: "Would love for you to hear each member's solo."
   • If no specific invitation language in Description → still close with "Would love to hear what you think." / "Hope you enjoy it." / "Would love for you to give it a listen."
   FORBIDDEN endings: ending the pitch on a sound-description sentence with no ask; ending on "Looking forward to hearing back" alone with no listen-invite; ending on a "consider for your playlist" line that omits the personal listen-invite.
6. Sign-off: "${userName || 'OTONAMI Team'}" via OTONAMI

═══ ABSOLUTE RULES ═══
- NEVER write "I hope this email finds you well"
- NEVER invent achievements, numbers, or awards not in the profile
- NEVER OMIT a specific fact, number, award, or ambition that the artist wrote in the Description. If the Description mentions a specific thing (Grammy, SXSW count, monthly streams, signed to label X), it MUST appear in the pitch body with the same specificity. Silently dropping a Description fact is a failure.
- NEVER use vague superlatives without evidence
- NEVER write a real curator name. ANYWHERE you would refer to the curator personally — greeting, hook, mid-sentence — use the literal text "[Curator Name]". The frontend substitutes this token per recipient. Writing a real name will cause every recipient of a multi-curator pitch to receive the wrong salutation.
- DO NOT include any URLs, links, or labels like "Stream:", "Listen:", "Spotify:", "YouTube:", "Apple Music:", "SoundCloud:", "Website:", "Instagram:", "X:", "Twitter:" in the pitch body or EPK. The OTONAMI email template renders a dedicated "Listen & respond" CTA and the artist's social links as buttons. Including URLs in the body creates duplicate CTAs and breaks the layout. Talk about the music and the artist; do NOT paste links.
- ALL output text must be 100% English. ZERO Japanese characters allowed in the pitch or EPK.
- If the artist description/bio is in Japanese, translate the MEANING into natural English. NEVER include the original Japanese text, not even in parentheses like "(楽しいバンドです)".
- Do NOT put romanized Japanese or Japanese text in quotes, parentheses, or inline translations.
- Keep pitch body under 180 words
- ${socialLines.length > 0 ? 'DO include follower/listener counts as social proof — curators use these numbers to evaluate potential' : 'Do NOT invent follower counts'}

═══ EPK BIO (after "---EPK---") ═══
Write a 100-120 word professional bio in third person. Lead with strongest credential. Mention notable platforms/releases by name where relevant (e.g. "released via Sony Music", "featured on NHK"), but do NOT include URLs or labeled link lists — the email renders the artist's social links as buttons separately.

═══ OUTPUT FORMAT ═══
Start with "Subject: " line. Then the pitch. Then "---EPK---" separator. Then the EPK bio. Nothing else.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      // Lower temperature so rule-following is consistent across runs.
      // Default 1.0 caused the AI to occasionally pull mood words from the
      // curator's preferredMoods despite explicit forbiddens.
      temperature: 0.3,
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
