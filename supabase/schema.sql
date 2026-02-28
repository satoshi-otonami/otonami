-- ═══════════════════════════════════════════════
--  OTONAMI Database Schema (Supabase PostgreSQL)
--  Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- Users (artists & curators)
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('artist', 'curator')),
  name TEXT NOT NULL,
  name_en TEXT,
  credits INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Artists profile
CREATE TABLE artists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  genre TEXT,
  mood TEXT,
  description TEXT,
  song_title TEXT,
  song_link TEXT,
  influences TEXT,
  achievements TEXT,
  -- Social links
  link_spotify TEXT,
  link_apple TEXT,
  link_youtube TEXT,
  link_soundcloud TEXT,
  link_instagram TEXT,
  link_twitter TEXT,
  link_facebook TEXT,
  link_website TEXT,
  -- Follower counts (auto-fetched or manual)
  followers_spotify INTEGER DEFAULT 0,
  followers_youtube INTEGER DEFAULT 0,
  followers_soundcloud INTEGER DEFAULT 0,
  followers_instagram INTEGER DEFAULT 0,
  followers_twitter INTEGER DEFAULT 0,
  followers_facebook INTEGER DEFAULT 0,
  followers_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Curators
CREATE TABLE curators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('playlist', 'blog', 'radio', 'label', 'booker', 'advisor')),
  platform TEXT,
  platform_url TEXT,
  genres TEXT[], -- PostgreSQL array
  bio TEXT,
  audience INTEGER DEFAULT 0,
  region TEXT,
  avatar TEXT DEFAULT '🎵',
  offers TEXT[],
  badges TEXT[],
  credit_cost INTEGER DEFAULT 2,
  -- Stats
  pitches_received INTEGER DEFAULT 0,
  pitches_responded INTEGER DEFAULT 0,
  pitches_accepted INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pitches
CREATE TABLE pitches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES artists(id),
  curator_id UUID REFERENCES curators(id),
  user_id UUID REFERENCES users(id),
  -- Artist snapshot
  artist_name TEXT,
  artist_name_en TEXT,
  song_title TEXT,
  song_link TEXT,
  genre TEXT,
  -- Pitch content
  pitch_text TEXT NOT NULL,
  epk TEXT,
  pitch_style TEXT DEFAULT 'professional',
  credit_cost INTEGER DEFAULT 2,
  -- Status tracking
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'opened', 'listened', 'feedback', 'accepted', 'declined', 'expired')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  listened_at TIMESTAMPTZ,
  listen_duration INTEGER DEFAULT 0,
  feedback_at TIMESTAMPTZ,
  feedback TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  decision TEXT CHECK (decision IN ('accepted', 'declined', 'maybe')),
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit transactions
CREATE TABLE credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount INTEGER NOT NULL, -- positive = purchase, negative = spend
  type TEXT NOT NULL CHECK (type IN ('purchase', 'pitch_send', 'refund', 'bonus')),
  description TEXT,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email log
CREATE TABLE email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pitch_id UUID REFERENCES pitches(id),
  to_email TEXT NOT NULL,
  subject TEXT,
  type TEXT NOT NULL CHECK (type IN ('pitch', 'reminder', 'notification', 'feedback')),
  status TEXT DEFAULT 'sent',
  resend_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pitches_artist ON pitches(artist_id);
CREATE INDEX idx_pitches_curator ON pitches(curator_id);
CREATE INDEX idx_pitches_status ON pitches(status);
CREATE INDEX idx_pitches_user ON pitches(user_id);
CREATE INDEX idx_artists_user ON artists(user_id);
CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Seed curators (real data)
INSERT INTO curators (name, email, type, platform, platform_url, genres, bio, audience, region, avatar, offers, badges, credit_cost) VALUES
('Patrick St. Michel', 'patrickstmichel@gmail.com', 'blog', 'Make Believe Melodies', 'https://mbmelodies.substack.com/', ARRAY['Pop','Electronic','Indie Rock','Hip-Hop','Underground'], 'Tokyo-based American music writer. Running Make Believe Melodies since 2009. Writes for Japan Times, Pitchfork, Bandcamp Daily.', 28000, 'Global', '📝', ARRAY['Review','Feature','Newsletter'], ARRAY['verified','quality_fb'], 3),
('Leap250', 'leap250@blog.com', 'blog', 'Leap250''s Blog', 'https://leap250.blog/', ARRAY['Indie Rock','Alt Rock','Pop','J-Rock','Dream Pop'], 'Runs J-Music Monthly Roundup. Monthly Japanese music recommendations. Hosts Spotify J-Music Playlist Draft.', 5000, 'Global', '✍️', ARRAY['Review','Playlist Add','Feature'], ARRAY['high_answer','quality_fb'], 2),
('Ian Martin', 'callandresponse@gmail.com', 'blog', 'Clear And Refreshing', 'https://clearandrefreshing.wordpress.com/', ARRAY['Noise','Experimental','Post-Punk','Indie Rock','Punk'], 'UK-based writer in Tokyo. Runs Call And Response Records. Author of "Quit Your Band". Specializes in Japanese underground music.', 2500, 'JP/EN', '🔊', ARRAY['Review','Label Interest','Live Booking'], ARRAY['verified','selective'], 2),
('A-indie (yabori)', 'belong.media@gmail.com', 'blog', 'A-indie Media', 'https://a-indie.com/', ARRAY['Indie Rock','Shoegaze','Alt Rock','Garage Rock','Post Rock'], 'Runs BELONG Media. Bilingual (JP/EN) indie music publication since 2012.', 6000, 'JP/Global', '🎸', ARRAY['Review','Feature','Interview'], ARRAY['verified','high_answer'], 2),
('mMarukudeibu', 'marukudeibu@spotify.com', 'playlist', 'Japanese Jazz Fusion (Spotify)', 'https://open.spotify.com/playlist/3MzC0teQrDwCkyUJhd3YBd', ARRAY['Jazz','Fusion','Funk','City Pop'], 'One of the largest Japanese jazz fusion playlists on Spotify. 34,800+ saves.', 34800, 'Global', '🎷', ARRAY['Playlist Add'], ARRAY['high_accept'], 3),
('JaME World', 'info@jame-world.com', 'blog', 'JaME - Japanese Music Entertainment', 'https://jame-world.com/en', ARRAY['J-Rock','Pop','Metal','Visual Kei','Indie Rock'], 'Multilingual Japanese music entertainment media. Interviews, reviews, news.', 16400, 'Global', '🌐', ARRAY['Review','Interview','News Feature'], ARRAY['high_answer'], 3);
