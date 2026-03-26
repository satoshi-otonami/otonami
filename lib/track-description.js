/**
 * Convert audio features (0-1 scale) to human-readable musical descriptions
 * for use in AI pitch generation prompts.
 */
export function describeTrackCharacteristics(features) {
  if (!features) return { characteristics: '', genreText: '', moodText: '', raw: {} };

  const descriptions = [];

  // Energy (0-1)
  const energy = features.energy;
  if (energy != null) {
    if (energy >= 0.75) descriptions.push('high-energy');
    else if (energy >= 0.50) descriptions.push('moderate energy');
    else if (energy >= 0.25) descriptions.push('laid-back');
    else descriptions.push('ambient and calm');
  }

  // Danceability (0-1)
  const dance = features.danceability;
  if (dance != null) {
    if (dance >= 0.75) descriptions.push('highly danceable with an infectious groove');
    else if (dance >= 0.50) descriptions.push('rhythmically engaging');
    else if (dance >= 0.25) descriptions.push('subtle rhythmic complexity');
  }

  // Acousticness (0-1)
  const acoustic = features.acousticness;
  if (acoustic != null) {
    if (acoustic >= 0.75) descriptions.push('predominantly acoustic');
    else if (acoustic >= 0.50) descriptions.push('blending acoustic and electronic elements');
    else if (acoustic <= 0.25) descriptions.push('electronically produced');
  }

  // Instrumentalness (0-1)
  const instrumental = features.instrumentalness;
  if (instrumental != null) {
    if (instrumental >= 0.75) descriptions.push('primarily instrumental');
    else if (instrumental >= 0.50) descriptions.push('featuring both instrumental passages and vocals');
  }

  // Valence (0-1)
  const valence = features.valence;
  if (valence != null) {
    if (valence >= 0.75) descriptions.push('uplifting and positive in mood');
    else if (valence >= 0.50) descriptions.push('balanced between light and dark tones');
    else if (valence >= 0.25) descriptions.push('introspective and melancholic');
    else descriptions.push('dark and moody');
  }

  // Tempo (raw BPM)
  const tempo = features.tempo;
  if (tempo) {
    if (tempo >= 140) descriptions.push(`fast-paced at ${Math.round(tempo)} BPM`);
    else if (tempo >= 110) descriptions.push(`mid-to-uptempo at ${Math.round(tempo)} BPM`);
    else if (tempo >= 80) descriptions.push(`mid-tempo at ${Math.round(tempo)} BPM`);
    else descriptions.push(`slow-burning at ${Math.round(tempo)} BPM`);
  }

  // DJ Track APIのmoodスコアを活用
  const moodDescriptions = [];
  if (features.chill > 0.6) moodDescriptions.push('laid-back and atmospheric');
  if (features.hype > 0.6) moodDescriptions.push('high-energy and exciting');
  if (features.groove > 0.6) moodDescriptions.push('groove-driven');
  if (features.aggressive > 0.6) moodDescriptions.push('intense and powerful');
  if (features.dance_floor > 0.6) moodDescriptions.push('perfect for the dance floor');
  if (moodDescriptions.length) descriptions.push(moodDescriptions.join(', '));

  const genreText = features.genres?.length > 0 ? `Genre: ${features.genres.join(', ')}` : '';
  const moodText = features.moods?.length > 0 ? `Mood: ${features.moods.join(', ')}` : '';

  return {
    characteristics: descriptions.join(', '),
    genreText,
    moodText,
    raw: { energy, danceability: dance, acousticness: acoustic, instrumentalness: instrumental, valence, tempo },
  };
}
