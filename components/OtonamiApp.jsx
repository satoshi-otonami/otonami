'use client';
import { initSession, loadCurators, loadPitches, loadCredits,
         savePitchesToDB, saveCuratorToDB, saveCredits as saveCreditsDB,
         logEmail, insertPitchGetUUID } from '@/lib/db';

import API from '@/lib/api-client';
import { analyzeTrack } from '@/lib/api-track';
import { describeTrackCharacteristics } from '@/lib/track-description';
import { getMatchLabel, rankCurators, calculateMatchScore } from '@/lib/match-score';

import { useState, useEffect, useRef, useMemo } from "react";

// ─── Constants ───
const GENRES = ["Jazz","Fusion","Funk","City Pop","Lo-Fi","Electronic","Indie Rock","Alt Rock","Pop","Math Rock","Shoegaze","J-Rock","Hip-Hop","R&B","Experimental","Noise","Metal","Post Rock","Dream Pop","Neo-Soul","Soul","Instrumental","Prog","Punk","Visual Kei","World"];
const CURATOR_TYPES = [{id:"playlist",label:"プレイリスト",icon:"🎧"},{id:"label",label:"レコードレーベル",icon:"💿"},{id:"management",label:"マネジメント",icon:"🤝"},{id:"publisher",label:"出版社・パブリッシャー",icon:"📚"},{id:"blog",label:"ブログ・メディア",icon:"📝"},{id:"radio",label:"ラジオ・ポッドキャスト",icon:"📻"}];
const ARTIST_GENRES = ["Jazz","Funk","Latin","Soul","R&B","Pop","Indie Rock","Alt Rock","Electronic","Ambient","Hip-Hop","Classical","Folk","Country","Metal","Punk","J-Pop","J-Rock","K-Pop","Anime","Experimental","World Music","Reggae","Blues"];
const BADGES = {high_answer:"🟢 高回答率",high_accept:"⭐ 高採用率",selective:"💎 厳選",quality_fb:"📖 良質FB",verified:"✅ 認証済"};

// ─── Seed Curators (pre-registered, real-data based) ───
const SEED_CURATORS = [
  {id:"c_pstm",name:"Patrick St. Michel",email:"patrickstmichel@gmail.com",type:"blog",platform:"Make Believe Melodies",platformUrl:"https://mbmelodies.substack.com/",genres:["Electronic","Jazz","Funk","Ambient","Experimental"],bio:"東京在住のアメリカ人音楽ライター。2009年よりMake Believe Melodiesを運営。Japan Times, Pitchfork, Bandcamp Daily寄稿。",audience:28000,region:"Global",avatar:"📝",offers:["Review","Feature","Newsletter"],badges:["verified","quality_fb"],stats:{received:0,responded:0,accepted:0},joined:"2026-01-15",creditCost:3,audioProfile:{energy:0.65,danceability:0.65,acousticness:0.35,instrumentalness:0.20,valence:0.55},preferredMoods:["Energetic","Groovy","Sophisticated","Experimental"]},
  {id:"c_leap",name:"Leap250",email:"leap250@blog.com",type:"blog",platform:"Leap250's Blog",platformUrl:"https://leap250.blog/",genres:["J-Rock","Indie Rock","Pop","Dream Pop","J-Pop"],bio:"J-Music Monthly Roundup運営。毎月の日本音楽レコメンデーション。Spotify J-Music Playlist Draft主催。",audience:5000,region:"Global",avatar:"✍️",offers:["Review","Playlist Add","Feature"],badges:["high_answer","quality_fb"],stats:{received:0,responded:0,accepted:0},joined:"2026-01-20",creditCost:2,audioProfile:{energy:0.60,danceability:0.55,acousticness:0.45,instrumentalness:0.30,valence:0.55},preferredMoods:["Dreamy","Nostalgic","Energetic","Indie"]},
  {id:"c_ian",name:"Ian Martin",email:"callandresponse@gmail.com",type:"blog",platform:"Clear And Refreshing",platformUrl:"https://clearandrefreshing.wordpress.com/",genres:["Noise","Post-Punk","Indie Rock","Experimental","Punk"],bio:"東京在住の英国人ライター。Call And Response Records主宰。著書『Quit Your Band』。日本地下音楽シーンに特化。",audience:2500,region:"JP/EN",avatar:"🔊",offers:["Review","Label Interest","Live Booking"],badges:["verified","selective"],stats:{received:0,responded:0,accepted:0},joined:"2026-01-18",creditCost:2,audioProfile:{energy:0.80,danceability:0.40,acousticness:0.20,instrumentalness:0.40,valence:0.40},preferredMoods:["Aggressive","Experimental","Heavy","Raw"]},
  {id:"c_aind",name:"A-indie (yabori)",email:"belong.media@gmail.com",type:"blog",platform:"A-indie Media",platformUrl:"https://a-indie.com/",genres:["Indie Rock","J-Pop","Alternative","Experimental"],bio:"BELONG Media運営。2012年開始の日英バイリンガル・インディー音楽メディア。",audience:6000,region:"JP/Global",avatar:"🎸",offers:["Review","Feature","Interview"],badges:["verified","high_answer"],stats:{received:0,responded:0,accepted:0},joined:"2026-02-01",creditCost:2,audioProfile:{energy:0.65,danceability:0.50,acousticness:0.40,instrumentalness:0.35,valence:0.50},preferredMoods:["Dreamy","Energetic","Nostalgic","Indie"]},
  {id:"c_mrk",name:"mMarukudeibu",email:"marukudeibu@spotify.com",type:"playlist",platform:"Japanese Jazz Fusion (Spotify)",platformUrl:"https://open.spotify.com/playlist/3MzC0teQrDwCkyUJhd3YBd",genres:["Jazz","Fusion","Funk","City Pop"],bio:"Spotify最大級の日本ジャズフュージョンプレイリスト。34,800+ saves。",audience:34800,region:"Global",avatar:"🎷",offers:["Playlist Add"],badges:["high_accept"],stats:{received:0,responded:0,accepted:0},joined:"2026-02-05",creditCost:3,audioProfile:{energy:0.65,danceability:0.75,acousticness:0.45,instrumentalness:0.60,valence:0.70},preferredMoods:["Groovy","Sophisticated","Smooth","Energetic"]},
  {id:"c_jame",name:"JaME World",email:"info@jame-world.com",type:"blog",platform:"JaME - Japanese Music Entertainment",platformUrl:"https://jame-world.com/en",genres:["J-Pop","J-Rock","Visual Kei","Anime"],bio:"多言語対応の日本音楽エンターテイメントメディア。インタビュー、レビュー、ニュース。",audience:16400,region:"Global",avatar:"🌐",offers:["Review","Interview","News Feature"],badges:["high_answer"],stats:{received:0,responded:0,accepted:0},joined:"2026-02-10",creditCost:3,audioProfile:{energy:0.72,danceability:0.55,acousticness:0.30,instrumentalness:0.25,valence:0.55},preferredMoods:["Energetic","Dramatic","Heavy","Indie"]},
  {id:"c_yama",name:"Yamashita Satoshi",email:"satoshiy339@gmail.com",type:"label",platform:"Jazz & Funk Japan (Spotify)",platformUrl:"https://open.spotify.com/",genres:["Jazz","Funk","Latin","Soul","Fusion"],bio:"東京のジャズ・ファンク・ラテン専門プレイリストキュレーター。SXSW常連アーティストを中心に厳選。",audience:8500,region:"JP/Global",avatar:"🎺",offers:["Playlist Add","Feature"],badges:["high_accept","verified"],stats:{received:0,responded:0,accepted:0},joined:"2026-03-01",creditCost:2,audioProfile:{energy:0.70,danceability:0.78,acousticness:0.40,instrumentalness:0.55,valence:0.72},preferredMoods:["Groovy","Energetic","Latin","Soulful"]},
];

// ─── Demo Artists ───
const DEMO_ARTISTS = [
  {id:"a1",name:"ROUTE14band",nameEn:"ROUTE14band",genre:"Jazz, Funk, Latin",mood:"Energetic, Groovy",description:"トランペットをフロントに据えた7人編成のジャズファンクバンド。ラテン、ファンク、ジャズを融合させたオリジナルサウンド。",songTitle:"Crossroad",songLink:"https://open.spotify.com/track/example1",influences:"Snarky Puppy, Tower of Power",achievements:"SXSW 10年連続出演, Blue Note Tokyo公演",image:"🎺"},
  {id:"a2",name:"WONK",nameEn:"WONK",genre:"Neo-Soul, Jazz, Electronic",mood:"Sophisticated, Smooth",description:"エクスペリメンタル・ソウルバンド。ジャズ、ヒップホップ、エレクトロニカを独自に融合。",songTitle:"Presence",songLink:"https://open.spotify.com/track/example2",influences:"D'Angelo, Robert Glasper",achievements:"Billboard Live公演",image:"🎹"},
  {id:"a3",name:"宇宙団",nameEn:"Uchudan",genre:"Indie Rock, Dream Pop",mood:"Dreamy, Nostalgic",description:"大阪発の4人組。ドリーミーなギターサウンドとノスタルジックなメロディ。",songTitle:"星降る夜に",songLink:"",influences:"Yo La Tengo, くるり",achievements:"FUJI ROCK出演",image:"🌌"},
];

// ─── Advanced Pitch Template Engine (no API needed) ───
const PE = {
  subjects: {
    professional: (a) => [`${a.nameEn||a.name} — ${(a.genre||"").split(",")[0].trim()} from Japan | For Your Consideration`, `New from Japan: ${a.nameEn||a.name} (${(a.genre||"").split(",")[0].trim()})`, `${a.nameEn||a.name} — "${a.songTitle||"New Release"}" | Japanese ${(a.genre||"").split(",")[0].trim()}`],
    casual: (a) => [`Think you'd dig this — ${a.nameEn||a.name} from Japan`, `A Japanese ${(a.genre||"").split(",")[0].trim()} act I think you'll love`, `${a.nameEn||a.name} — something fresh from Japan`],
    storytelling: (a) => [`Close your eyes and listen — ${a.nameEn||a.name}`, `The sound coming out of Japan right now | ${a.nameEn||a.name}`, `What ${(a.genre||"").split(",")[0].trim()} sounds like from Tokyo`],
  },
  hooks: {
    professional: {
      playlist: (a,c) => `I'm reaching out on behalf of ${a.nameEn||a.name}, a ${a.genre||""} act from Japan whose sound would be a strong fit for ${c.platform||"your playlist"}.`,
      blog: (a,c) => `I'd like to introduce ${a.nameEn||a.name} to ${c.platform||"your readers"} — a ${a.genre||""} act from Japan with a sound that's generating real momentum.`,
      radio: (a,c) => `I'm writing to submit ${a.nameEn||a.name} for airplay consideration on ${c.platform||"your show"}. Their ${(a.genre||"").split(",")[0].trim()} sound from Japan offers something genuinely fresh.`,
      label: (a,c) => `I'd like to bring ${a.nameEn||a.name} to your attention — a ${a.genre||""} act from Japan with a growing international profile that aligns with ${c.platform||"your roster"}'s direction.`,
      _: (a,c) => `I'd like to introduce ${a.nameEn||a.name}, a ${a.genre||""} act from Japan that deserves a wider international audience.`,
    },
    casual: {
      playlist: (a,c) => `Hey! I've been following ${c.platform||"your playlist"} for a while and think ${a.nameEn||a.name} would fit right in — they're a ${a.genre||""} group from Japan with serious groove.`,
      blog: (a,c) => `Hi — big fan of what you cover on ${c.platform||"your site"}. I think you'd enjoy ${a.nameEn||a.name}, doing exciting things in the ${(a.genre||"").split(",")[0].trim()} space out of Japan.`,
      _: (a,c) => `Hey! Wanted to share ${a.nameEn||a.name} with you — a ${a.genre||""} act from Japan I think you and your audience would genuinely enjoy.`,
    },
    storytelling: {
      _: (a) => {
        const m = {"Energetic":"a wave of sound that hits before you can think — raw energy, precision, and soul all at once","Groovy":"a bass line that locks into your spine, horns that light up the room, and a groove so deep you forget where you are","Dreamy":"that moment late at night when the city quiets down and something beautiful floats through the air","Heavy":"a low rumble that builds into a wall of sound so thick you can almost touch it","Sophisticated":"rare music that rewards every listen — layers that reveal themselves slowly, melodies that linger","Emotional":"music that doesn't need translation — it reaches somewhere words can't","Cinematic":"a soundtrack to a film that hasn't been made yet — vivid, sweeping, unforgettable","Explosive":"controlled chaos that somehow makes perfect sense — the musical equivalent of fireworks","Technical":"the kind of playing that makes other musicians stop and stare, then start dancing"};
        const mood1 = (a.mood||"").split(",")[0].trim();
        return "Imagine " + (m[mood1] || "a sound that transcends borders — no context needed to feel it") + `. That's ${a.nameEn||a.name}.`;
      },
    },
  },
  body: (a, lnk, fol) => {
    const p = [];
    if (a.description) {
      const d = a.description.replace(/。/g, ". ").replace(/、/g, ", ").replace(/\s+/g, " ").trim();
      if (d.length > 10) p.push(d.length > 200 ? d.substring(0, 200).replace(/\.[^.]*$/, ".") : d);
    }
    if (a.mood && a.genre) p.push(`Their sound blends ${a.genre} with ${a.mood.toLowerCase()} energy${a.influences ? ", channeling the spirit of " + a.influences : ""}.`);
    else if (a.influences) p.push(`For fans of ${a.influences}.`);
    if (a.achievements) p.push(`Credentials: ${a.achievements}.`);
    // Social proof with follower counts
    const proof = PE.socialProof(lnk, fol);
    if (proof) p.push(proof);
    return p.join(" ");
  },
  // Build social proof sentence from follower data
  socialProof: (lnk, fol) => {
    if (!fol) return "";
    const fmt = (n) => { if (!n || n <= 0) return ""; if (n >= 1000000) return (n/1000000).toFixed(1).replace(/\.0$/,"") + "M"; if (n >= 1000) return (n/1000).toFixed(1).replace(/\.0$/,"") + "K"; return String(n); };
    const parts = [];
    if (fol.spotify && lnk.spotify) parts.push(fmt(fol.spotify) + " Spotify followers");
    if (fol.youtube && lnk.youtube) parts.push(fmt(fol.youtube) + " YouTube subscribers");
    if (fol.instagram && lnk.instagram) parts.push(fmt(fol.instagram) + " Instagram followers");
    if (fol.twitter && lnk.twitter) parts.push(fmt(fol.twitter) + " followers on X");
    if (fol.facebook && lnk.facebook) parts.push(fmt(fol.facebook) + " Facebook followers");
    if (fol.soundcloud && lnk.soundcloud) parts.push(fmt(fol.soundcloud) + " SoundCloud followers");
    if (parts.length === 0) return "";
    if (parts.length === 1) return `With ${parts[0]}, they've built a dedicated audience organically.`;
    return `Their online presence includes ${parts.join(", ")} — a growing, engaged community.`;
  },
  cta: {
    playlist: (a, lnk) => `Give "${a.songTitle||"their latest"}" a listen${lnk.songLink ? ": " + lnk.songLink : lnk.spotify ? ": " + lnk.spotify : ""}. If it fits, a playlist add would mean the world.`,
    blog: (a, lnk) => `Would you be open to checking out "${a.songTitle||"their latest"}"${lnk.songLink || lnk.spotify ? " (" + (lnk.songLink||lnk.spotify) + ")" : ""}? Happy to arrange an interview or provide assets for a feature.`,
    radio: (a, lnk) => `Their track "${a.songTitle||"latest release"}" is ready for airplay${lnk.songLink || lnk.spotify ? " — " + (lnk.songLink||lnk.spotify) : ""}. It would be an honor to hear it on your show.`,
    label: (a, lnk) => `I'd welcome the chance to discuss ${a.nameEn||a.name}'s potential${lnk.songLink || lnk.spotify ? ". Start here: " + (lnk.songLink||lnk.spotify) : ""}.`,
    _: (a, lnk) => `Give "${a.songTitle||"their latest"}" a listen${lnk.songLink || lnk.spotify ? ": " + (lnk.songLink||lnk.spotify) : ""} — I think it'll resonate.`,
  },
  closes: {
    professional: ["Thank you for your time and consideration.", "Looking forward to hearing your thoughts.", "I appreciate you taking the time to listen."],
    casual: ["No pressure — just wanted this on your radar!", "Would love to hear what you think!", "Thanks for being open to new sounds!"],
    storytelling: ["I'll leave the music to speak for itself.", "Sometimes the best discoveries come from unexpected places.", "Looking forward to hearing if the sound moves you the way it moved me."],
  },
  linksBlock: (lnk, fol) => {
    const fmt = (n) => { if (!n || n <= 0) return ""; if (n >= 1000000) return (n/1000000).toFixed(1).replace(/\.0$/,"") + "M"; if (n >= 1000) return (n/1000).toFixed(1).replace(/\.0$/,"") + "K"; return String(n); };
    const f = fol || {};
    const items = [];
    if (lnk.spotify) items.push("🎧 Spotify: " + lnk.spotify + (f.spotify ? " (" + fmt(f.spotify) + " followers)" : ""));
    if (lnk.apple) items.push("🍎 Apple Music: " + lnk.apple);
    if (lnk.youtube) items.push("▶️ YouTube: " + lnk.youtube + (f.youtube ? " (" + fmt(f.youtube) + " subscribers)" : ""));
    if (lnk.soundcloud) items.push("☁️ SoundCloud: " + lnk.soundcloud + (f.soundcloud ? " (" + fmt(f.soundcloud) + " followers)" : ""));
    if (lnk.instagram) items.push("📷 Instagram: " + lnk.instagram + (f.instagram ? " (" + fmt(f.instagram) + " followers)" : ""));
    if (lnk.twitter) items.push("𝕏 X: " + lnk.twitter + (f.twitter ? " (" + fmt(f.twitter) + " followers)" : ""));
    if (lnk.facebook) items.push("📘 Facebook: " + lnk.facebook + (f.facebook ? " (" + fmt(f.facebook) + " followers)" : ""));
    if (lnk.website) items.push("🌐 " + lnk.website);
    return items.length ? "\n" + items.join("\n") : "";
  },
  generate: (artist, curator, style, lnk, userName, fol) => {
    const pick = (a) => a[Math.floor(Math.random()*a.length)];
    const sub = pick(PE.subjects[style]?.(artist) || PE.subjects.professional(artist));
    const hMap = PE.hooks[style] || PE.hooks.professional;
    const hFn = hMap[curator.type] || hMap._ || PE.hooks.professional._;
    const hook = hFn(artist, curator);
    const body = PE.body(artist, lnk, fol);
    const ctaFn = PE.cta[curator.type] || PE.cta._;
    const cta = ctaFn(artist, lnk);
    const close = pick(PE.closes[style] || PE.closes.professional);
    const links = PE.linksBlock(lnk, fol);
    return `Subject: ${sub}\n\nHi [Curator Name],\n\n${hook}\n\n${body}\n\n${cta}${links}\n\n${close}\n\nWarm regards,\n${userName}\nvia OTONAMI — Connecting Japanese Artists with the World`;
  },
  epk: (artist, lnk, fol) => {
    const fmt = (n) => { if (!n || n <= 0) return ""; if (n >= 1000000) return (n/1000000).toFixed(1).replace(/\.0$/,"") + "M"; if (n >= 1000) return (n/1000).toFixed(1).replace(/\.0$/,"") + "K"; return String(n); };
    const f = fol || {};
    const aName = artist.nameEn || artist.name;
    let e = `【 ${aName} 】\nGenre: ${artist.genre||"N/A"}\nMood: ${artist.mood||"N/A"}\n\n`;
    if (artist.description) e += artist.description.replace(/。/g, ". ").replace(/、/g, ", ") + "\n\n";
    if (artist.achievements) e += "Notable: " + artist.achievements + "\n";
    if (artist.influences) e += "For fans of: " + artist.influences + "\n";
    // Social with followers
    const ll = [];
    if (lnk.spotify) ll.push("Spotify: " + lnk.spotify + (f.spotify ? " (" + fmt(f.spotify) + " followers)" : ""));
    if (lnk.apple) ll.push("Apple Music: " + lnk.apple);
    if (lnk.youtube) ll.push("YouTube: " + lnk.youtube + (f.youtube ? " (" + fmt(f.youtube) + " subs)" : ""));
    if (lnk.soundcloud) ll.push("SoundCloud: " + lnk.soundcloud + (f.soundcloud ? " (" + fmt(f.soundcloud) + ")" : ""));
    if (lnk.instagram) ll.push("IG: " + lnk.instagram + (f.instagram ? " (" + fmt(f.instagram) + ")" : ""));
    if (lnk.twitter) ll.push("X: " + lnk.twitter + (f.twitter ? " (" + fmt(f.twitter) + ")" : ""));
    if (lnk.website) ll.push("Web: " + lnk.website);
    if (ll.length) e += "\n" + ll.join(" | ");
    return e;
  },
};

// ─── Artist Local DB (instant lookup — 60+ artists) ───
const ARTIST_DB = [
  // === Jazz / Fusion ===
  {keys:["t-square","t square","ティースクエア"],name:"T-SQUARE",nameEn:"T-SQUARE",genre:"Jazz Fusion, Smooth Jazz",mood:"Energetic, Uplifting",description:"日本のジャズフュージョンを代表するバンド。1976年結成以来、卓越したテクニックとキャッチーなメロディで国内外のファンを魅了。サックス奏者・伊東たけしの華やかな音色が特徴。",songTitle:"TRUTH",influences:"Casiopea, Weather Report, The Crusaders",achievements:"F1テーマ曲TRUTHが国民的ヒット, 50枚以上のアルバム, 日本ゴールドディスク大賞"},
  {keys:["casiopea","カシオペア"],name:"カシオペア",nameEn:"Casiopea",genre:"Jazz Fusion, City Pop",mood:"Groovy, Technical",description:"1977年結成の日本を代表するフュージョンバンド。超絶テクニックとポップなメロディの融合で、T-SQUAREと並び日本フュージョンの双璧。",songTitle:"Asayake",influences:"T-SQUARE, Lee Ritenour, Larry Carlton",achievements:"30枚以上のアルバム, 日本ゴールドディスク大賞, アジアツアー多数"},
  {keys:["wonk","ウォンク"],name:"WONK",nameEn:"WONK",genre:"Neo-Soul, Jazz, Electronic, Hip-Hop",mood:"Sophisticated, Experimental",description:"エクスペリメンタル・ソウルバンド。ジャズ、ヒップホップ、エレクトロニカを独自のバランスで融合させ、国内外で高い評価を受ける。長塚健斗のボーカルとバンドの即興的グルーヴが唯一無二。",songTitle:"Cyberspace",influences:"D'Angelo, Robert Glasper, Flying Lotus",achievements:"Billboard Live公演, FUJI ROCK出演, 海外フェス多数出演"},
  {keys:["soil","pimp","soil&pimp"],name:"SOIL&\"PIMP\"SESSIONS",nameEn:"SOIL & PIMP SESSIONS",genre:"Jazz, Club Jazz, Funk",mood:"Wild, Explosive",description:"デスジャズを標榜する6人組ジャズバンド。圧倒的なエネルギーのライブパフォーマンスで、ジャズの枠を超えたクラブシーンでの人気を確立。",songTitle:"Waltz for Sby",influences:"Art Blakey, Snarky Puppy, DJ Krush",achievements:"Blue Note契約, 世界ツアー多数, FUJI ROCK常連"},
  {keys:["snarky puppy","スナーキー・パピー"],name:"Snarky Puppy",nameEn:"Snarky Puppy",genre:"Jazz Fusion, Funk, World",mood:"Groovy, Expansive",description:"ブルックリン拠点の大編成ジャズファンクバンド。ジャズ、ファンク、ワールドミュージックを融合した圧倒的なライブパフォーマンスで世界的人気。",songTitle:"Lingus",influences:"Vulfpeck, Lettuce, Medeski Martin & Wood",achievements:"グラミー賞4回受賞, GroundUP Music Festival主催"},
  {keys:["dimension","ディメンション"],name:"DIMENSION",nameEn:"DIMENSION",genre:"Jazz Fusion, Smooth Jazz",mood:"Smooth, Sophisticated",description:"1992年結成のフュージョンユニット。勝田一樹(sax)と増崎孝司(gt)を中心に、洗練されたサウンドと高い演奏力で日本のフュージョンシーンを代表。",songTitle:"Bitter Sweet",influences:"T-SQUARE, Casiopea, Pat Metheny",achievements:"20枚以上のアルバム, 日本フュージョンシーンの第一線"},
  {keys:["fox capture plan","フォックスキャプチャープラン","fcp"],name:"fox capture plan",nameEn:"fox capture plan",genre:"Jazz, Post Rock, Progressive",mood:"Cinematic, Intense",description:"ピアノトリオの枠を超えた革新的サウンドで注目される3人組。ジャズをベースにポストロック、プログレの要素を融合し、映画的スケールの楽曲を生み出す。",songTitle:"Butterfly Effect",influences:"toe, LITE, Mouse on the Keys",achievements:"TVアニメ主題歌多数, 海外ツアー, ビルボードライブ公演"},
  {keys:["eric miyashiro","エリック・ミヤシロ","宮城路"],name:"Eric Miyashiro",nameEn:"Eric Miyashiro",genre:"Jazz, Fusion, Big Band",mood:"Powerful, Virtuosic",description:"ハワイ出身の日系トランペット奏者。圧倒的なハイノートと多彩な表現力で、日本のジャズ・スタジオシーンを代表するトップトランペッター。",songTitle:"Blue Horizon",influences:"Maynard Ferguson, Arturo Sandoval",achievements:"Blue Note Tokyo公演多数, スタジオワーク1000曲以上"},
  {keys:["route14","route14band","ルート14"],name:"ROUTE14band",nameEn:"ROUTE14band",genre:"Jazz, Funk, Latin",mood:"Energetic, Groovy",description:"トランペットをフロントに据えた7人編成のジャズファンクバンド。ラテン、ファンク、ジャズを融合させたオリジナルサウンドで、SXSW 10年連続出演。",songTitle:"Crossroad",influences:"Snarky Puppy, Tower of Power, SOIL&PIMP SESSIONS",achievements:"SXSW 10年連続出演, Blue Note Tokyo公演"},
  {keys:["mouse on the keys","マウス・オン・ザ・キーズ","motk"],name:"mouse on the keys",nameEn:"mouse on the keys",genre:"Jazz, Post Rock, Instrumental",mood:"Intense, Cinematic",description:"ツインピアノとドラムの3人組。ジャズとポストロックを高次元で融合させ、圧倒的なライブパフォーマンスで国内外に熱狂的ファンを持つ。",songTitle:"Spectres de Mouse",influences:"LITE, toe, Battles",achievements:"欧米ツアー多数, FUJI ROCK出演"},
  {keys:["h zettrio","エイチ・ゼットリオ"],name:"H ZETTRIO",nameEn:"H ZETTRIO",genre:"Jazz, Funk, Pop",mood:"Fun, Colorful",description:"ピアニストH ZETTが率いるジャズトリオ。ジャズの即興性とポップの親しみやすさを融合。カラフルなビジュアルと共に「楽しいジャズ」を提案。",songTitle:"Get Happy",influences:"上原ひろみ, Snarky Puppy",achievements:"Billboard Live公演多数, TV出演多数"},
  {keys:["hiromi","上原ひろみ","uehara hiromi"],name:"上原ひろみ",nameEn:"Hiromi Uehara",genre:"Jazz, Fusion, Progressive",mood:"Virtuosic, Dynamic",description:"世界的ジャズピアニスト。圧倒的テクニックと情熱的なパフォーマンスで国際的に高い評価を受ける。Telarc/Concord Jazzからリリース。",songTitle:"Spark",influences:"Chick Corea, Oscar Peterson, Ahmad Jamal",achievements:"グラミー賞ノミネート, Blue Note公演, 世界50カ国以上でツアー"},
  // === Rock / Alternative / Indie ===
  {keys:["king gnu","キングヌー"],name:"King Gnu",nameEn:"King Gnu",genre:"Rock, Pop, Art Rock",mood:"Artistic, Dramatic",description:"常田大希率いる4人組ロックバンド。クラシック・現代音楽の素養をロック/ポップに昇華させた独自のサウンドで、日本の音楽シーンに新風を吹き込んだ。",songTitle:"Hakujitsu",influences:"Radiohead, Queen, Sheena Ringo",achievements:"紅白歌合戦出場, 日本レコード大賞優秀作品賞, ドーム公演"},
  {keys:["boris","ボリス"],name:"Boris",nameEn:"Boris",genre:"Experimental, Drone, Shoegaze, Metal",mood:"Heavy, Atmospheric",description:"1992年結成の3人組。ドローン、シューゲイザー、ストーナー、ノイズを横断する唯一無二のサウンドで海外での評価が極めて高い。",songTitle:"Flood",influences:"Melvins, My Bloody Valentine, Earth",achievements:"Warp Records契約, Pitchfork高評価多数, 世界ツアー常連"},
  {keys:["tricot","トリコ"],name:"tricot",nameEn:"tricot",genre:"Math Rock, Indie Rock, J-Rock",mood:"Dynamic, Playful",description:"京都発の4人組マスロックバンド。複雑なリズムとポップなメロディを両立させ、中嶋イッキュウの個性的なボーカルが楽曲に独特の色を添える。",songTitle:"Afureru",influences:"toe, LITE, Number Girl",achievements:"海外ツアー多数, SXSW出演, Topshelf Records(US)リリース"},
  {keys:["toe","トー"],name:"toe",nameEn:"toe",genre:"Math Rock, Post Rock, Instrumental",mood:"Emotional, Intricate",description:"2000年結成の4人組インストゥルメンタルバンド。複雑な変拍子と繊細なメロディを融合させた楽曲で、日本のマスロック/ポストロックシーンを牽引。",songTitle:"Goodbye",influences:"LITE, 54-71, Tortoise",achievements:"世界ツアー多数, Topshelf Records(US)リリース, アジア欧米で熱狂的ファンベース"},
  {keys:["lite","ライト"],name:"LITE",nameEn:"LITE",genre:"Math Rock, Post Rock, Instrumental",mood:"Technical, Energetic",description:"2003年結成のインストゥルメンタル・マスロックバンド。圧倒的なテクニックとタイトなアンサンブルで、toeと並び日本のマスロックを世界に発信。",songTitle:"Bond",influences:"toe, Battles, Don Caballero",achievements:"Topshelf Records契約, 欧米アジアツアー多数, FUJI ROCK出演"},
  {keys:["kinoko teikoku","きのこ帝国"],name:"きのこ帝国",nameEn:"Kinoko Teikoku",genre:"Shoegaze, Dream Pop, Indie Rock",mood:"Dreamy, Melancholic",description:"シューゲイザー/ドリームポップバンド。分厚いギターノイズと佐藤千亜妃の透明感あるボーカルが織りなす、美しくも儚いサウンドスケープ。",songTitle:"Chronostasis",influences:"My Bloody Valentine, Cocteau Twins, Lush",achievements:"日本武道館公演, メジャーデビュー, SWEET LOVE SHOWER出演"},
  {keys:["otoboke beaver","オトボケビーバー"],name:"おとぼけビ〜バ〜",nameEn:"Otoboke Beaver",genre:"Punk, Noise Rock, Garage",mood:"Chaotic, Fun",description:"京都発の4人組ガールズパンクバンド。爆速テンポと叫ぶような日本語ボーカル、ユーモラスな歌詞で海外パンクシーンから熱烈な支持。",songTitle:"Datsu Hikage no Onna",influences:"Shonen Knife, Melt-Banana, Deerhoof",achievements:"Damnably Records(UK)契約, 世界ツアー, Pitchfork掲載"},
  {keys:["number girl","ナンバーガール"],name:"NUMBER GIRL",nameEn:"NUMBER GIRL",genre:"Alternative Rock, Post-Punk, Noise",mood:"Raw, Intense",description:"1995年福岡で結成。向井秀徳の絶叫ボーカルとノイジーなギターで日本のオルタナティブロックに革命を起こした伝説的バンド。2019年再結成。",songTitle:"透明少女",influences:"Pixies, Sonic Youth, Eastern Youth",achievements:"日本インディーロックの金字塔, RISING SUN ROCK FESTIVAL常連, 再結成武道館公演"},
  {keys:["zazen boys","ザゼンボーイズ"],name:"ZAZEN BOYS",nameEn:"ZAZEN BOYS",genre:"Art Rock, Post-Punk, Experimental",mood:"Tense, Hypnotic",description:"NUMBER GIRL解散後に向井秀徳が結成。反復的リフと独特の歌唱法で唯一無二のグルーヴを生み出すアートロックバンド。",songTitle:"Kimochi",influences:"Can, Talking Heads, NUMBER GIRL",achievements:"FUJI ROCK常連, 独自レーベル運営"},
  {keys:["gezan","ゲザン"],name:"GEZAN",nameEn:"GEZAN",genre:"Experimental, Noise Rock, Psychedelic",mood:"Chaotic, Spiritual",description:"マヒトゥ・ザ・ピーポー率いる実験的ロックバンド。ノイズ、サイケデリック、フォークを横断し、DIY精神で独自の音楽コミュニティを構築。",songTitle:"DNA",influences:"Boredoms, Fushitsusha, Swans",achievements:"全感覚祭主催, 海外フェス出演, Netflix映画出演"},
  {keys:["melt banana","メルトバナナ"],name:"Melt-Banana",nameEn:"Melt-Banana",genre:"Noise Rock, Grindcore, Experimental",mood:"Extreme, Frenetic",description:"1992年結成のノイズロックデュオ。超高速ビートとヤマタカEYEのノイズが融合した唯一無二のサウンドで海外コアファンを持つ。",songTitle:"Shield for Your Eyes",influences:"Boredoms, Napalm Death, Merzbow",achievements:"30年以上の海外ツアー歴, John Peel Session出演"},
  {keys:["mono","モノ"],name:"MONO",nameEn:"MONO",genre:"Post Rock, Shoegaze, Orchestral",mood:"Epic, Emotional",description:"1999年結成のインストゥルメンタルポストロックバンド。壮大なギターレイヤーとオーケストラの融合で「音の壁」を構築。海外での人気が国内以上。",songTitle:"Ashes in the Snow",influences:"Mogwai, Godspeed You! Black Emperor, Sigur Rós",achievements:"Temporary Residence Ltd契約, 世界50カ国ツアー, Steve Albini録音"},
  {keys:["envy","エンヴィー"],name:"envy",nameEn:"envy",genre:"Post-Hardcore, Screamo, Post Rock",mood:"Cathartic, Beautiful",description:"1992年結成。激情ハードコアと美しいポストロックを融合させた独自のサウンドで、世界のポストハードコアシーンに多大な影響。",songTitle:"A Warm Room",influences:"Mogwai, At the Drive-In, Converge",achievements:"Temporary Residence Ltd契約, 世界ツアー多数, Deathwish Inc.リリース"},
  {keys:["radwimps","ラッドウィンプス"],name:"RADWIMPS",nameEn:"RADWIMPS",genre:"Rock, Alternative, Pop",mood:"Emotional, Anthemic",description:"野田洋次郎率いる4人組バンド。繊細な歌詞と壮大なサウンドで若者を中心に圧倒的支持。新海誠映画の音楽で世界的知名度を獲得。",songTitle:"Zenzenzense",influences:"Radiohead, Bump of Chicken",achievements:"映画『君の名は。』音楽担当, 紅白歌合戦出場, アジアツアー"},
  {keys:["asian kung-fu generation","アジカン","akfg"],name:"ASIAN KUNG-FU GENERATION",nameEn:"ASIAN KUNG-FU GENERATION",genre:"Alternative Rock, Power Pop, Indie",mood:"Energetic, Melodic",description:"2000年代の日本ロックを代表するバンド。後藤正文のソングライティングとパワフルなギターロックでアニメ主題歌を通じてアジア全域に影響。",songTitle:"Rewrite",influences:"Weezer, Number Girl, Pixies",achievements:"CDJ常連, アニメ主題歌多数, アジアツアー成功"},
  // === Pop / Singer-Songwriter ===
  {keys:["vaundy","バウンディ"],name:"Vaundy",nameEn:"Vaundy",genre:"Pop, Rock, R&B, Electronic",mood:"Versatile, Contemporary",description:"マルチクリエイターとして楽曲制作から映像まで手がけるシンガーソングライター。ジャンルを自在に横断するポップセンスと中毒性のあるメロディでZ世代を中心に爆発的人気。",songTitle:"Kaijuu no Hanauta",influences:"King Gnu, Fujii Kaze, Kenshi Yonezu",achievements:"Spotify日本1位多数, アニメ主題歌多数, 武道館公演"},
  {keys:["fujii kaze","藤井風"],name:"藤井風",nameEn:"Fujii Kaze",genre:"Pop, R&B, Soul, Jazz",mood:"Soulful, Free-spirited",description:"岡山出身のシンガーソングライター・ピアニスト。ソウルフルな歌声とジャジーなピアノ、日本語と英語を自在に操る表現力で国際的に注目。",songTitle:"Shinunoga E-Wa",influences:"Stevie Wonder, Bruno Mars, 宇多田ヒカル",achievements:"紅白歌合戦出場, Spotify海外リスナー急増, パリコレ出演"},
  {keys:["kenshi yonezu","米津玄師"],name:"米津玄師",nameEn:"Kenshi Yonezu",genre:"Pop, Rock, Electronic",mood:"Innovative, Melancholic",description:"ボカロP「ハチ」として活動後、シンガーソングライターとして日本の音楽シーンを席巻。独特の世界観と中毒性のあるメロディメイキングで社会現象を巻き起こす。",songTitle:"Lemon",influences:"BUMP OF CHICKEN, Radiohead, DECO*27",achievements:"Lemon 300万DL, 紅白歌合戦出場, ドーム公演"},
  {keys:["ado","アド"],name:"Ado",nameEn:"Ado",genre:"Pop, Rock, Vocaloid-influenced",mood:"Powerful, Dynamic",description:"顔出しなしの歌い手から一躍スターに。圧倒的な歌唱力と幅広い表現力で、映画『ONE PIECE FILM RED』のウタ役として世界的ヒット。",songTitle:"Ussewa",influences:"ボカロ文化, Eve, まふまふ",achievements:"うっせぇわ1億再生, ONE PIECE映画主題歌, ワールドツアー"},
  {keys:["yorushika","ヨルシカ"],name:"ヨルシカ",nameEn:"Yorushika",genre:"Indie Pop, Rock, Literary",mood:"Melancholic, Beautiful",description:"コンポーザーn-bunaとボーカルsuisのユニット。文学的な歌詞と透明感のあるサウンドで、物語性の強い楽曲世界を構築。",songTitle:"Haru Dorobou",influences:"BUMP OF CHICKEN, ボカロ文化",achievements:"Spotify人気アーティスト, 日本武道館公演"},
  {keys:["yoasobi","ヨアソビ"],name:"YOASOBI",nameEn:"YOASOBI",genre:"Pop, Electronic, J-Pop",mood:"Bright, Catchy",description:"コンポーザーAyaseとボーカルikuraのユニット。小説を楽曲化するコンセプトで「夜に駆ける」が社会現象に。",songTitle:"Yoru ni Kakeru",influences:"ボカロ文化, supercell",achievements:"Billboard Japan 1位, 紅白歌合戦出場, 世界配信ヒット"},
  {keys:["aimer","エメ"],name:"Aimer",nameEn:"Aimer",genre:"Pop, Rock, Ballad",mood:"Ethereal, Emotional",description:"ハスキーで透明感のある歌声が特徴の女性シンガー。アニメ主題歌を中心に多くのヒットを持ち、ライブでの圧倒的な歌唱力で定評。",songTitle:"Brave Shine",influences:"Cocteau Twins, Sigur Rós",achievements:"紅白歌合戦出場, 国立競技場公演, アニメ主題歌多数"},
  {keys:["sheena ringo","椎名林檎","東京事変","tokyo jihen"],name:"椎名林檎",nameEn:"Sheena Ringo",genre:"Art Rock, Jazz, Pop, Experimental",mood:"Provocative, Sophisticated",description:"唯一無二の存在感を持つアーティスト。ロック、ジャズ、歌謡曲を自在に横断する音楽性と挑発的な表現で、日本の音楽に多大な影響。",songTitle:"Marunouchi Sadistic",influences:"Bjork, David Bowie, 戸川純",achievements:"東京事変主宰, 東京五輪開会式音楽, NHK紅白歌合戦常連"},
  // === Hip-Hop / R&B ===
  {keys:["awich","エイウィッチ"],name:"Awich",nameEn:"Awich",genre:"Hip-Hop, R&B, Rap",mood:"Powerful, Authentic",description:"沖縄出身の女性ラッパー。バイリンガルなリリックと圧倒的な存在感で日本のヒップホップシーンを革新。",songTitle:"GILA GILA",influences:"Lauryn Hill, Jay-Z, Rihanna",achievements:"紅白歌合戦出場, 武道館公演, Universal Music契約"},
  {keys:["wednesday campanella","水曜日のカンパネラ","suiyoubi"],name:"水曜日のカンパネラ",nameEn:"Wednesday Campanella",genre:"Electropop, Hip-Hop, Experimental",mood:"Quirky, Colorful",description:"独創的な音楽性とビジュアルで唯一無二の存在。現在のボーカル詩羽が加入後も実験精神を維持しつつポップ性を拡大。",songTitle:"Shakushain",influences:"Björk, M.I.A., CAPSULE",achievements:"FUJI ROCK出演, Coachella出演, 世界ツアー"},
  {keys:["millennium parade","ミレニアムパレード","ミレパ"],name:"millennium parade",nameEn:"millennium parade",genre:"Electronic, Hip-Hop, Art Pop",mood:"Cinematic, Futuristic",description:"King Gnuの常田大希が主宰するクリエイティブ集団。映像・ファッション・音楽を融合した総合芸術的アプローチ。",songTitle:"U",influences:"Flying Lotus, Arca, King Gnu",achievements:"映画『竜とそばかすの姫』主題歌, 紅白歌合戦出場"},
  {keys:["nujabes","ヌジャベス"],name:"Nujabes",nameEn:"Nujabes",genre:"Jazz Hip-Hop, Lo-fi, Instrumental",mood:"Chill, Soulful",description:"ジャズとヒップホップを融合させた先駆者。Lo-fi Hip-Hopムーブメントの源流として世界的に崇拝される伝説的プロデューサー。",songTitle:"Feather",influences:"J Dilla, DJ Shadow, A Tribe Called Quest",achievements:"サムライチャンプルー音楽担当, Lo-fi文化の始祖として世界的評価"},
  // === Electronic / Ambient ===
  {keys:["cornelius","コーネリアス","小山田圭吾"],name:"Cornelius",nameEn:"Cornelius",genre:"Electronic, Experimental Pop, Shibuya-kei",mood:"Precise, Playful",description:"小山田圭吾のソロプロジェクト。緻密なサウンドデザインと実験精神で「音の魔術師」として国際的評価。渋谷系の代表格。",songTitle:"Point of View Point",influences:"Brian Wilson, Kraftwerk, Yellow Magic Orchestra",achievements:"Matador Records契約, グラミー賞ノミネート"},
  {keys:["susumu yokota","横田進"],name:"横田進",nameEn:"Susumu Yokota",genre:"Ambient, Techno, House",mood:"Ethereal, Organic",description:"日本のエレクトロニック音楽の巨匠。テクノからアンビエント、クラシカルまで幅広い作風で国際的に高い評価。",songTitle:"Kodomotachi",influences:"Brian Eno, Aphex Twin, Steve Reich",achievements:"Leaf Records契約, Pitchfork Best New Music"},
  {keys:["rei harakami","レイ・ハラカミ"],name:"レイ・ハラカミ",nameEn:"Rei Harakami",genre:"Electronic, Ambient, Glitch",mood:"Warm, Nostalgic",description:"温かみのあるアナログ感覚のエレクトロニカで唯一無二の音世界を構築。矢野顕子とのコラボ「yanokami」でも知られる。",songTitle:"Owari no Kisetsu",influences:"Aphex Twin, Boards of Canada, YMO",achievements:"くるりとのコラボ, 独自のサウンド美学で世界的評価"},
  {keys:["midori takada","高田みどり"],name:"高田みどり",nameEn:"Midori Takada",genre:"Ambient, Minimalism, Percussion",mood:"Meditative, Hypnotic",description:"パーカッショニスト/作曲家。1983年のアルバム「Through the Looking Glass」がストリーミング時代に世界的再発見を受けた。",songTitle:"Mr. Henri Rousseau's Dream",influences:"Steve Reich, Terry Riley",achievements:"WRWTFWW Records再発で世界的再評価, ヨーロッパツアー"},
  // === City Pop / Retro ===
  {keys:["tatsuro yamashita","山下達郎","タツロー"],name:"山下達郎",nameEn:"Tatsuro Yamashita",genre:"City Pop, AOR, Soul",mood:"Groovy, Summery",description:"日本のシティポップを代表するシンガーソングライター。完璧主義的な音楽制作と温かみのあるボーカルで40年以上第一線。",songTitle:"Christmas Eve",influences:"The Beach Boys, Marvin Gaye, Steely Dan",achievements:"Christmas Eve 毎年チャートイン, 日本レコード大賞"},
  {keys:["mariya takeuchi","竹内まりや"],name:"竹内まりや",nameEn:"Mariya Takeuchi",genre:"City Pop, Pop, AOR",mood:"Warm, Nostalgic",description:"「Plastic Love」がインターネットを通じて世界的にリバイバルヒット。山下達郎の妻としても知られるシティポップの女王。",songTitle:"Plastic Love",influences:"Carole King, Carpenters",achievements:"Plastic Love 世界的バイラルヒット, 国民的シンガー"},
  {keys:["toshiki kadomatsu","角松敏生"],name:"角松敏生",nameEn:"Toshiki Kadomatsu",genre:"City Pop, Funk, AOR",mood:"Funky, Sophisticated",description:"シティポップ/AORの代表格。ファンキーなギターとソフィスティケイテッドなサウンドプロダクションで、現在も国内外で高い人気。",songTitle:"Take You to the Sky High",influences:"Earth, Wind & Fire, David Foster",achievements:"プロデューサーとしても活躍, 杏里等に楽曲提供"},
  // === Indie / Emerging ===
  {keys:["uchuu nippon setagaya","宇宙日本世田谷","uchudan","宇宙団"],name:"宇宙団",nameEn:"Uchudan",genre:"Indie Rock, Dream Pop",mood:"Dreamy, Nostalgic",description:"大阪発の4人組。ドリーミーなギターサウンドとノスタルジックなメロディ。",songTitle:"星降る夜に",influences:"Yo La Tengo, くるり",achievements:"FUJI ROCK出演"},
  {keys:["hyukoh","혁오","ヒョゴ"],name:"HYUKOH",nameEn:"HYUKOH",genre:"Indie Rock, Dream Pop",mood:"Laid-back, Melancholic",description:"韓国出身だが日本でも絶大な人気のインディーロックバンド。オーイ・ヒョクの脱力系ボーカルとドリーミーなサウンドが特徴。",songTitle:"Wi ing Wi ing",influences:"Mac DeMarco, The Strokes",achievements:"Coachella出演, アジアツアー成功"},
  {keys:["lucky tapes","ラッキーテープス"],name:"Lucky Tapes",nameEn:"Lucky Tapes",genre:"Indie Pop, City Pop Revival",mood:"Groovy, Feel-good",description:"シティポップリバイバルの文脈で注目される4人組。80年代のグルーヴ感と現代的なセンスを融合させた心地よいサウンド。",songTitle:"22",influences:"Yogee New Waves, Never Young Beach, 山下達郎",achievements:"FUJI ROCK出演, 大型フェス常連"},
  {keys:["never young beach","ネバーヤングビーチ","ネバヤン"],name:"never young beach",nameEn:"never young beach",genre:"Surf Rock, Folk, Indie Pop",mood:"Breezy, Nostalgic",description:"はっぴいえんどの流れを汲むサーフロック/フォーク。安部勇磨の脱力ボーカルと温かいサウンドで新世代シティポップを体現。",songTitle:"明るい未来",influences:"はっぴいえんど, 細野晴臣",achievements:"メジャーデビュー, FUJI ROCK出演"},
  {keys:["yogee new waves","ヨギーニューウェーブス"],name:"Yogee New Waves",nameEn:"Yogee New Waves",genre:"Indie Rock, City Pop Revival",mood:"Warm, Sunny",description:"東京発のインディーロックバンド。温かみのあるギターポップと角舘健悟の柔らかいボーカルで、新世代シティポップの旗手。",songTitle:"CLIMAX NIGHT",influences:"くるり, never young beach, フリッパーズ・ギター",achievements:"FUJI ROCK出演, 大型フェス常連, 台湾ツアー"},
  {keys:["cero","セロ"],name:"cero",nameEn:"cero",genre:"Neo-Soul, City Pop, Experimental Pop",mood:"Sophisticated, Layered",description:"Contemporary Exotica Rockの略。ソウル、ジャズ、ワールドミュージックを消化した緻密なサウンドで批評家から高い評価。",songTitle:"Summer Soul",influences:"D'Angelo, Cornelius, はっぴいえんど",achievements:"FUJI ROCK出演, 音楽メディア年間ベスト常連"},
  {keys:["chai","チャイ"],name:"CHAI",nameEn:"CHAI",genre:"Electro-Pop, Punk, Indie",mood:"Energetic, Cute",description:"「NEOかわいい」を標榜する4人組。パンク精神とポップセンスを融合し、ジェンダー規範へのメッセージを楽しい音楽で発信。",songTitle:"N.E.O.",influences:"Deerhoof, Superorganism, きゃりーぱみゅぱみゅ",achievements:"Sub Pop Records契約, Coachella出演, 北米ツアー"},
  {keys:["kohh","コウ"],name:"KOHH",nameEn:"KOHH",genre:"Hip-Hop, Trap, Rap",mood:"Raw, Emotional",description:"東京・北区王子出身のラッパー。日本語ラップの概念を覆すフロウと赤裸々なリリックで国内外のヒップホップシーンに衝撃。Frank Oceanアルバムに参加。",songTitle:"Nandemonaiya",influences:"Lil Wayne, Future, ANARCHY",achievements:"Frank Ocean「Blonde」参加, Keith Ape「It G Ma」参加, 海外メディア多数掲載"},
  {keys:["millennium parade"],name:"",nameEn:"",genre:"",mood:"",description:"",songTitle:"",influences:"",achievements:""}, // already listed above, duplicate key protection
  {keys:["sakanaction","サカナクション"],name:"サカナクション",nameEn:"Sakanaction",genre:"Electronic Rock, Synth Pop, Dance",mood:"Atmospheric, Groove",description:"山口一郎率いる5人組。エレクトロニカとロックの融合で、クラブカルチャーとロックの架け橋となる存在。",songTitle:"Shin Takarajima",influences:"Kraftwerk, New Order, くるり",achievements:"NHK紅白歌合戦出場, 日本レコード大賞, 東京ドーム公演"},
  {keys:["perfume","パフューム"],name:"Perfume",nameEn:"Perfume",genre:"Electropop, Technopop, Dance",mood:"Futuristic, Cute",description:"中田ヤスタカプロデュースの3人組テクノポップユニット。最先端テクノロジーを駆使したライブ演出と完成度の高い楽曲で世界進出。",songTitle:"Polyrhythm",influences:"CAPSULE, YMO, Daft Punk",achievements:"Coachella出演, 世界ツアー, NHK紅白常連"},
  {keys:["babymetal","ベビーメタル"],name:"BABYMETAL",nameEn:"BABYMETAL",genre:"Kawaii Metal, J-Pop, Metal",mood:"Explosive, Fun",description:"アイドルとヘヴィメタルを融合させた唯一無二のユニット。メタルフェスの常連として世界的人気を確立。",songTitle:"Gimme Chocolate!!",influences:"Metallica, Cannibal Corpse, きゃりーぱみゅぱみゅ",achievements:"Wembley Arena公演, Download Festival出演, Metallicaサポート"},
  {keys:["band-maid","バンドメイド"],name:"BAND-MAID",nameEn:"BAND-MAID",genre:"Hard Rock, J-Rock",mood:"Powerful, Technical",description:"メイド服姿で本格派ハードロックを演奏する5人組ガールズバンド。圧倒的な演奏力とヘヴィなサウンドで海外ロックファンを魅了。",songTitle:"Domination",influences:"Guns N' Roses, Halestorm",achievements:"米国ツアー成功, Lzzy Hale絶賛, 日本武道館公演"},
  {keys:["one ok rock","ワンオクロック","oor"],name:"ONE OK ROCK",nameEn:"ONE OK ROCK",genre:"Rock, Alternative, Pop Rock",mood:"Anthemic, Emotional",description:"Takaの圧倒的なボーカルとエモーショナルな楽曲で日本を代表するロックバンドに成長。英語楽曲でのグローバル展開に成功。",songTitle:"Wherever You Are",influences:"Linkin Park, My Chemical Romance",achievements:"ワールドツアー, Fueled by Ramen契約, Ed Sheeranツアーサポート"},
];
// Remove empty duplicate entry
const ARTIST_DB_CLEAN = ARTIST_DB.filter(a => a.name);

// ─── Demo Auto-Progression removed ───
// 自動ステータス進行コードを削除。
// ステータス更新はキュレーターの実際のアクションのみで行う。

// ─── Storage helpers ───

// ─── Email Notification System (simulated) ───
const EMAIL_TEMPLATES = {
  pitchSent: (artist, curator) => ({
    to: curator.email, subject: `🎵 新しいピッチが届きました — ${artist.nameEn || artist.name}`,
    body: `${curator.name}様\n\n${artist.nameEn||artist.name}からピッチが届きました。\n7日以内にフィードバックをお願いします。\n\nOTONAMIにログインしてレビュー:\nhttps://otonami.jp/curator/inbox\n\nOTONAMI Team`,
  }),
  curatorOpened: (artist, curator) => ({
    to: artist.email, subject: `👁 ${curator.name}がピッチを開封しました`,
    body: `${artist.name}様\n\n${curator.name} (${curator.platform}) があなたのピッチを開封しました。\n\nトラッキング:\nhttps://otonami.jp/tracking\n\nOTONAMI Team`,
  }),
  curatorFeedback: (artist, curator, decision, feedback, actionType) => ({
    to: artist.email,
    subject: decision === "accepted"
      ? `🎉 ${curator.name}があなたの楽曲を採用しました！`
      : `📋 ${curator.name}からフィードバックが届きました`,
    body: `${artist.name}様\n\n${curator.name} (${curator.platform}) から${decision==="accepted"?"採用":"フィードバック"}のお知らせです。\n\n` +
      (decision==="accepted" ? `【採用アクション】${actionType||"プレイリスト追加"}\n\n` : "") +
      `【フィードバック】\n${feedback}\n\n` +
      `詳細を確認:\nhttps://otonami.jp/tracking\n\nOTONAMI Team`,
  }),
  deadlineReminder: (curator, pitch, daysLeft) => ({
    to: curator.email, subject: `⏰ レビュー期限まであと${daysLeft}日 — ${pitch.artistNameEn||pitch.artistName}`,
    body: `${curator.name}様\n\n${pitch.artistNameEn||pitch.artistName}の「${pitch.songTitle}」のレビュー期限まであと${daysLeft}日です。\n期限内にフィードバックがない場合、クレジットが返還されます。\n\nレビューする:\nhttps://otonami.jp/curator/inbox\n\nOTONAMI Team`,
  }),
  artistReply: (artist, curator, message) => ({
    to: curator.email, subject: `💬 ${artist.name}からの返信`,
    body: `${curator.name}様\n\n${artist.name}からフィードバックへの返信が届きました:\n\n「${message}」\n\nOTONAMI Team`,
  }),
};

const sendEmail = async (template) => {
  // 📝 PRODUCTION: Replace with actual email API (SendGrid, AWS SES, etc.)
  const log = await S.get("otonami-email-log") || [];
  const entry = { ...template, sentAt: new Date().toISOString(), id: "mail_" + Date.now() + "_" + Math.random().toString(36).substr(2,4) };
  const updated = [entry, ...log].slice(0, 200);
  await S.set("otonami-email-log", updated);
  console.log("📧 Email sent:", template.subject, "→", template.to);
  return entry;
};

// ─── Action Types for curator decisions ───
const ACTION_TYPES = [
  {id:"playlist",label:"プレイリスト追加",icon:"🎧",desc:"Spotifyプレイリストに追加"},
  {id:"blog",label:"ブログ/メディア掲載",icon:"📝",desc:"レビュー記事を掲載"},
  {id:"social",label:"SNS紹介",icon:"📱",desc:"Instagram/X等で紹介"},
  {id:"radio",label:"ラジオ/ポッドキャスト",icon:"📻",desc:"番組で紹介・オンエア"},
  {id:"label",label:"レーベル検討",icon:"💿",desc:"契約・リリース検討"},
  {id:"other",label:"その他",icon:"🎯",desc:"ライブブッキング等"},
];

// ─── Time Ago Helper ───
const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return s + "秒前";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "分前";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "時間前";
  const d = Math.floor(h / 24);
  return d + "日前";
};

// ─── App ───
export default function App() {
  const [mode, setMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('role') === 'artist') { localStorage.setItem('otonami-mode', 'artist'); return 'artist'; }
      return localStorage.getItem('otonami-mode') || null;
    } catch { return null; }
  });
  const [user, setUser] = useState(() => {
    try { const s = localStorage.getItem('otonami-user'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [curators, setCurators] = useState([]);
  const [pitches, setPitches] = useState([]);
  const [credits, setCredits] = useState(20);
  const [notif, setNotif] = useState(null);
  const [page, setPage] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const hasUser = !!localStorage.getItem('otonami-user');
      if (hasUser) {
        const tab = params.get('tab');
        if (tab && ["dashboard","curators","pitch","tracking","analytics","shop"].includes(tab)) return tab;
        return "dashboard";
      }
      // ?role=artist → skip landing, go to auth
      if (params.get('role') === 'artist') return "auth";
    } catch {}
    return "landing";
  });
  const historyTabRef = useRef(false); // true after first artist tab push

  const notify = (msg, type="success") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),4000); };

  // ── Browser history: sync artist tabs with pushState ──
  const ARTIST_TABS = ["dashboard","curators","pitch","tracking","analytics","shop"];
  useEffect(() => {
    if (!ARTIST_TABS.includes(page)) return;
    const url = `/studio?tab=${page}`;
    if (!historyTabRef.current) {
      window.history.replaceState({ tab: page }, '', url);
      historyTabRef.current = true;
    } else {
      window.history.pushState({ tab: page }, '', url);
    }
  }, [page]); // eslint-disable-line

  useEffect(() => {
    const onPop = (e) => {
      const tab = e.state?.tab;
      if (tab && ARTIST_TABS.includes(tab)) setPage(tab);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []); // eslint-disable-line

  // Load data from storage
  useEffect(() => {
    (async () => {
const dbCurators = await loadCurators();
if (dbCurators && dbCurators.length > 0) {
  // Merge audioProfile / preferredMoods from SEED_CURATORS for known curators
  const merged = dbCurators.map(c => {
    const seed = SEED_CURATORS.find(s => s.id === c.id);
    if (seed) return { ...c, audioProfile: c.audioProfile || seed.audioProfile, preferredMoods: c.preferredMoods?.length ? c.preferredMoods : seed.preferredMoods };
    return c;
  });
  // Add any SEED_CURATORS not yet in DB
  const dbIds = new Set(merged.map(c => c.id));
  const seedOnly = SEED_CURATORS.filter(s => !dbIds.has(s.id));
  setCurators([...merged, ...seedOnly]);
} else {
  setCurators([...SEED_CURATORS]);
}
await initSession();
const savedCredits = await loadCredits();
setCredits(savedCredits ?? 20);
const userEmail = user?.email || null;
const savedPitches = await loadPitches(userEmail);
if (savedPitches?.length) setPitches(savedPitches);
    })();
    const s = document.createElement("style");
    s.textContent = `@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}`;
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, []);

  // Save helpers
const savePitches = async (p) => {
  setPitches(p);
  await savePitchesToDB(p);
};
// DBから最新のピッチを再取得してstateを更新（キュレーター操作後の反映に使用）
const refreshPitches = async () => {
  const fresh = await loadPitches(user?.email || null);
  if (fresh?.length) setPitches(fresh);
  return fresh;
};
const saveCurators = async (c) => {
  setCurators(c);
  for (const curator of c) {
    if (!curator.isSeed) await saveCuratorToDB(curator);
  }
};
const saveCredits = async (c) => {
  setCredits(c);
  await saveCreditsDB(c);
};
  // Check for expired pitches (7-day deadline) and refund credits
  useEffect(() => {
    if (pitches.length === 0) return;
    const now = Date.now();
    let refundTotal = 0;
    const updated = pitches.map(p => {
      const dl = p.deadline ? new Date(p.deadline) : (p.sentAt ? new Date(new Date(p.sentAt).getTime() + 7*24*60*60*1000) : null);
      if (p.status === "sent" && dl && dl.getFullYear() > 2000 && dl.getTime() < now && !p.refunded) {
        refundTotal += (p.creditCost || 2);
        return {...p, status: "expired", refunded: true};
      }
      return p;
    });
    if (refundTotal > 0) {
      savePitches(updated);
      saveCredits(credits + refundTotal);
      notify(`💰 期限切れピッチに対し${refundTotal}クレジットを返還しました`);
    }
  }, [pitches.length]); // eslint-disable-line

  const updatePitch = async (id, updates) => {
    setPitches(prev => {
      const np = prev.map(p => p.id === id ? {...p, ...updates} : p);
      savePitchesToDB(np);
      return np;
    });
  };

  // ─── Landing ───
  if (page === "landing" && !user) return <Landing onArtist={() => { setMode("artist"); try { localStorage.setItem('otonami-mode', 'artist'); } catch {} setPage("auth"); }} onCurator={() => { window.location.href = '/curator'; }} />;
  // ─── Auth ───
  if (page === "auth" && !user) return <Auth mode={mode} curators={curators} onLogin={(u) => { setUser(u); try { localStorage.setItem('otonami-user', JSON.stringify(u)); } catch {} const tab = new URLSearchParams(window.location.search).get('tab'); const validTab = tab && ["dashboard","curators","pitch","tracking","analytics","shop"].includes(tab) ? tab : null; setPage(validTab || (mode === "artist" ? "dashboard" : "curator-inbox")); }} onBack={() => setPage("landing")} onRegisterCurator={async (c) => { const nc = [...curators, c]; await saveCurators(nc); setUser(c); try { localStorage.setItem('otonami-user', JSON.stringify(c)); localStorage.setItem('otonami-mode', 'curator'); } catch {} setPage("curator-inbox"); notify("キュレーター登録完了！"); }} />;

  // ─── Main App ───
  return (
    <div style={css.shell}>
      {notif && <div style={{...css.toast, background: notif.type==="success" ? "linear-gradient(135deg,#c4956a,#e85d3a)" : "linear-gradient(135deg,#dc2626,#ea580c)"}}>{notif.type==="success"?"✓":"!"} {notif.msg}</div>}
      {mode === "artist" ? (
        <ArtistApp user={user} curators={curators} pitches={pitches} credits={credits} page={page} setPage={setPage} savePitches={savePitches} saveCredits={saveCredits} notify={notify} updatePitch={updatePitch} refreshPitches={refreshPitches} />
      ) : (
        <CuratorApp user={user} pitches={pitches} page={page} setPage={setPage} savePitches={savePitches} notify={notify} updatePitch={updatePitch} curators={curators} saveCurators={saveCurators} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// LANDING PAGE
// ═══════════════════════════════════════
function Landing({onArtist, onCurator}) {
  return <div style={{minHeight:"100vh",background:"#f8f7f4",color:"#1a1a1a",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
    <div style={{maxWidth:900,margin:"0 auto",padding:"2rem 1.5rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4rem"}}>
        <div style={{fontSize:"1.5rem",fontWeight:800,letterSpacing:"2px",color:"#c4956a",fontFamily:"'Playfair Display',Georgia,serif"}}>
          OTONAMI
          <span style={{fontSize:"0.6rem",color:"#9a958e",marginLeft:6,verticalAlign:"super"}}>β</span>
        </div>
        <button onClick={onCurator} style={{padding:"0.5rem 1.2rem",background:"transparent",border:"1px solid rgba(196,149,106,0.3)",color:"#c4956a",borderRadius:8,fontSize:"0.82rem",cursor:"pointer",fontFamily:"inherit"}}>キュレーターとして参加</button>
      </div>

      <div style={{textAlign:"center",marginBottom:"3rem"}}>
        <div style={{fontSize:"0.82rem",color:"#c4956a",fontWeight:600,marginBottom:"0.8rem",letterSpacing:"0.1em"}}>JAPANESE INDIE MUSIC × WORLD</div>
        <h1 style={{fontSize:"clamp(2rem,5vw,3.2rem)",fontWeight:800,lineHeight:1.15,marginBottom:"1.2rem",letterSpacing:"-0.02em",color:"#1a1a1a",fontFamily:"'Playfair Display',Georgia,serif"}}>
          日本の音楽を、<br/>
          <span style={{color:"#c4956a"}}>世界のキュレーターへ</span>
        </h1>
        <p style={{fontSize:"1.05rem",color:"#6b6560",maxWidth:520,margin:"0 auto 2rem",lineHeight:1.7}}>
          AIが生成するプロ品質の英語ピッチ。アプリ内で直接送信し、<br/>開封・試聴・フィードバックまで全てトラッキング。
        </p>
        <div style={{display:"flex",gap:"0.8rem",justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={onArtist} style={{padding:"0.85rem 2rem",background:"#e85d3a",color:"#fff",border:"none",borderRadius:12,fontSize:"1rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(232,93,58,0.25)"}}>🎵 アーティスト / レーベルとして始める</button>
          <button onClick={() => { window.location.href = '/curator'; }} style={{padding:"0.85rem 2rem",background:"#ffffff",color:"#1a1a1a",border:"1px solid rgba(0,0,0,0.06)",borderRadius:12,fontSize:"1rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>🎧 キュレーターとして登録</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem",marginBottom:"3rem"}}>
        {[["6","登録キュレーター"],["7日","フィードバック保証"],["¥0","キュレーター登録無料"],["AI","英語ピッチ自動生成"]].map(([n,l],i) =>
          <div key={i} style={{background:"#ffffff",border:"1px solid rgba(0,0,0,0.06)",borderRadius:16,padding:"1.5rem",textAlign:"center"}}>
            <div style={{fontSize:"1.8rem",fontWeight:800,color:"#c4956a"}}>{n}</div>
            <div style={{fontSize:"0.78rem",color:"#6b6560",marginTop:4}}>{l}</div>
          </div>
        )}
      </div>

      <div style={{background:"#ffffff",border:"1px solid rgba(0,0,0,0.06)",borderRadius:20,padding:"2rem",marginBottom:"2rem"}}>
        <h2 style={{fontSize:"1.3rem",fontWeight:700,marginBottom:"1.5rem",textAlign:"center",color:"#1a1a1a",fontFamily:"'Playfair Display',Georgia,serif"}}>仕組み</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"1.5rem"}}>
          {[
            ["1️⃣","アーティスト情報入力","曲のURL入力でAIが自動取得"],
            ["2️⃣","キュレーター選択","ジャンル・タイプでフィルター"],
            ["3️⃣","AIピッチ生成","プロ品質の英語メールを自動作成"],
            ["4️⃣","アプリ内送信","メール不要。直接キュレーターに届く"],
            ["5️⃣","リアルタイム追跡","開封・試聴・フィードバックを確認"],
          ].map(([icon,title,desc],i) =>
            <div key={i} style={{textAlign:"center"}}>
              <div style={{fontSize:"1.5rem",marginBottom:6}}>{icon}</div>
              <div style={{fontWeight:700,fontSize:"0.88rem",marginBottom:4,color:"#1a1a1a"}}>{title}</div>
              <div style={{fontSize:"0.75rem",color:"#6b6560"}}>{desc}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{textAlign:"center",padding:"2rem 0",borderTop:"1px solid rgba(0,0,0,0.05)"}}>
        <div style={{fontSize:"0.75rem",color:"#9a958e"}}>OTONAMI — Connecting Japanese Music to the World | TYCompany LLC / ILCJ</div>
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════
// AUTH (Login / Register)
// ═══════════════════════════════════════
function Auth({mode, curators, onLogin, onBack, onRegisterCurator}) {
  const [tab, setTab] = useState("login"); // login | register
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // Curator registration fields
  const [cType, setCType] = useState("playlist");
  const [cPlatform, setCPlatform] = useState("");
  const [cUrl, setCUrl] = useState("");
  const [cGenres, setCGenres] = useState([]);
  const [cBio, setCBio] = useState("");
  const [cAudience, setCAudience] = useState("");
  const [cOffers, setCOffers] = useState([]);

  const toggleGenre = g => setCGenres(p => p.includes(g) ? p.filter(x=>x!==g) : [...p,g]);
  const toggleOffer = o => setCOffers(p => p.includes(o) ? p.filter(x=>x!==o) : [...p,o]);
  const offerOptions = ["Playlist Add","Review","Interview","Feature","Newsletter","Radio Play","Label Interest","Live Booking","Sync/Licensing","Advice"];

  const handleLogin = () => {
    if (!name.trim() || !email.trim()) return;
    if (mode === "curator") {
      const found = curators.find(c => c.email.toLowerCase() === email.toLowerCase());
if (found) { onLogin(found); return; }
// パスワード認証は現在Supabase未対応のためメールのみで認証
    }
    onLogin({ id: "u_" + Date.now(), name, email, type: mode });
  };

  const handleRegister = () => {
    if (!name.trim() || !email.trim() || !cPlatform.trim() || cGenres.length === 0) return;
    const newCurator = {
      id: "c_" + Date.now(),
      name, email, type: cType,
      platform: cPlatform, platformUrl: cUrl,
      genres: cGenres, bio: cBio,
      audience: parseInt(cAudience) || 0,
      region: "Global",
      avatar: CURATOR_TYPES.find(t=>t.id===cType)?.icon || "🎧",
      offers: cOffers,
      badges: [],
      stats: { received: 0, responded: 0, accepted: 0 },
      joined: new Date().toISOString().split("T")[0],
    };
    onRegisterCurator(newCurator);
  };

  const isCuratorMode = mode === "curator";

  return <div style={{minHeight:"100vh",background:"#f8f7f4",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',system-ui,sans-serif",padding:"1rem"}}>
    <div style={{width:"100%",maxWidth:isCuratorMode && tab==="register" ? 580 : 420,background:"#ffffff",border:"1px solid rgba(0,0,0,0.06)",borderRadius:24,padding:"2rem",color:"#1a1a1a"}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:"#6b6560",cursor:"pointer",fontSize:"0.82rem",marginBottom:"1rem",fontFamily:"inherit"}}>← 戻る</button>
      <h2 style={{fontSize:"1.4rem",fontWeight:800,marginBottom:"0.3rem",color:"#1a1a1a"}}>
        {isCuratorMode ? "🎧 キュレーター" : "🎵 アーティスト / レーベル"}
      </h2>
      <p style={{color:"#6b6560",fontSize:"0.85rem",marginBottom:"1.5rem"}}>{isCuratorMode ? "登録して新しい音楽を発見しましょう" : "日本の音楽を世界へ届けましょう"}</p>

      {isCuratorMode && <div style={{display:"flex",gap:8,marginBottom:"1.5rem"}}>
        {["login","register"].map(t => <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"0.6rem",background:tab===t?"rgba(196,149,106,0.08)":"transparent",border:tab===t?"1px solid rgba(196,149,106,0.3)":"1px solid rgba(0,0,0,0.06)",color:tab===t?"#c4956a":"#6b6560",borderRadius:10,cursor:"pointer",fontSize:"0.82rem",fontWeight:600,fontFamily:"inherit"}}>{t==="login"?"ログイン":"新規登録"}</button>)}
      </div>}

      <input value={name} onChange={e=>setName(e.target.value)} placeholder="名前 / Your Name" style={css.authInput}/>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="メールアドレス" type="email" style={css.authInput}/>

      {isCuratorMode && tab === "register" && <>
        <div style={{fontSize:"0.78rem",color:"#c4956a",fontWeight:600,marginTop:"1rem",marginBottom:"0.5rem"}}>プラットフォームタイプ</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:"1rem"}}>
          {CURATOR_TYPES.map(t => <button key={t.id} onClick={()=>setCType(t.id)} style={{padding:"0.4rem 0.8rem",background:cType===t.id?"rgba(196,149,106,0.08)":"transparent",border:cType===t.id?"1px solid #c4956a":"1px solid rgba(0,0,0,0.06)",color:cType===t.id?"#c4956a":"#6b6560",borderRadius:8,cursor:"pointer",fontSize:"0.75rem",fontFamily:"inherit"}}>{t.icon} {t.label}</button>)}
        </div>
        <input value={cPlatform} onChange={e=>setCPlatform(e.target.value)} placeholder="プラットフォーム名（例: My Jazz Playlist）" style={css.authInput}/>
        <input value={cUrl} onChange={e=>setCUrl(e.target.value)} placeholder="URL（Spotify, ブログ等）" style={css.authInput}/>
        <input value={cAudience} onChange={e=>setCAudience(e.target.value)} placeholder="フォロワー / 読者数" type="number" style={css.authInput}/>

        <div style={{fontSize:"0.78rem",color:"#c4956a",fontWeight:600,marginTop:"0.5rem",marginBottom:"0.5rem"}}>受付ジャンル（必須）</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:"1rem"}}>
          {GENRES.map(g => <button key={g} onClick={()=>toggleGenre(g)} style={{padding:"0.25rem 0.6rem",background:cGenres.includes(g)?"rgba(196,149,106,0.15)":"transparent",border:cGenres.includes(g)?"1px solid #c4956a":"1px solid rgba(0,0,0,0.06)",color:cGenres.includes(g)?"#c4956a":"#6b6560",borderRadius:6,cursor:"pointer",fontSize:"0.68rem",fontFamily:"inherit"}}>{g}</button>)}
        </div>

        <div style={{fontSize:"0.78rem",color:"#c4956a",fontWeight:600,marginBottom:"0.5rem"}}>提供できるもの</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:"1rem"}}>
          {offerOptions.map(o => <button key={o} onClick={()=>toggleOffer(o)} style={{padding:"0.25rem 0.6rem",background:cOffers.includes(o)?"rgba(196,149,106,0.15)":"transparent",border:cOffers.includes(o)?"1px solid #c4956a":"1px solid rgba(0,0,0,0.06)",color:cOffers.includes(o)?"#c4956a":"#6b6560",borderRadius:6,cursor:"pointer",fontSize:"0.68rem",fontFamily:"inherit"}}>{o}</button>)}
        </div>

        <textarea value={cBio} onChange={e=>setCBio(e.target.value)} placeholder="自己紹介・編集方針..." rows={3} style={{...css.authInput,resize:"vertical",minHeight:60}}/>
      </>}

      <button onClick={isCuratorMode && tab==="register" ? handleRegister : handleLogin} style={{width:"100%",padding:"0.8rem",background:"#e85d3a",color:"#fff",border:"none",borderRadius:12,fontSize:"0.92rem",fontWeight:700,cursor:"pointer",marginTop:"0.5rem",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(232,93,58,0.25)"}}>
        {isCuratorMode && tab==="register" ? "キュレーター登録" : "ログイン"}
      </button>

      {!isCuratorMode && <button onClick={()=>{ onLogin({id:"demo",name:"Satoshi (Demo)",email:"satoshi@ilcj.org",type:"artist"}); }} style={{width:"100%",padding:"0.65rem",background:"transparent",color:"#6b6560",border:"1px solid rgba(0,0,0,0.06)",borderRadius:12,fontSize:"0.82rem",cursor:"pointer",marginTop:"0.6rem",fontFamily:"inherit"}}>✨ デモモードで体験</button>}
    </div>
  </div>;
}

// ═══════════════════════════════════════
// ARTIST APP
// ═══════════════════════════════════════
const EMPTY_ARTIST   = {name:"",nameEn:"",genre:"",mood:"",description:"",songTitle:"",songLink:"",influences:"",achievements:"",sns:""};
const EMPTY_LINKS    = {spotify:"",apple:"",youtube:"",soundcloud:"",instagram:"",twitter:"",facebook:"",website:""};
const EMPTY_FOLLOWERS = {spotify:0,youtube:0,soundcloud:0,instagram:0,twitter:0,facebook:0};

function loadArtistDraft() {
  try { const r = sessionStorage.getItem("otonami_artist_draft"); return r ? JSON.parse(r) : null; } catch { return null; }
}

function ArtistApp({user, curators, pitches, credits, page, setPage, savePitches, saveCredits, notify, updatePitch, refreshPitches}) {
  const [selected, setSelected] = useState([]);
  const [trackData, setTrackData] = useState(null);

  // ── Persistent artist form state (survives page navigation) ──
  const _draft = useMemo(() => loadArtistDraft(), []);
  const [artist,    setArtist]    = useState(_draft?.artist    || EMPTY_ARTIST);
  const [links,     setLinks]     = useState(_draft?.links     || EMPTY_LINKS);
  const [followers, setFollowers] = useState(_draft?.followers || EMPTY_FOLLOWERS);

  useEffect(() => {
    try { sessionStorage.setItem("otonami_artist_draft", JSON.stringify({artist, links, followers})); } catch {}
  }, [artist, links, followers]);

  const clearArtistDraft = () => {
    setArtist(EMPTY_ARTIST); setLinks(EMPTY_LINKS); setFollowers(EMPTY_FOLLOWERS);
    try { sessionStorage.removeItem("otonami_artist_draft"); } catch {}
  };

  const myPitches = pitches;

  const navItems = [
    {id:"dashboard",icon:"◉",label:"ホーム",badge:null},
    {id:"curators",icon:"◎",label:"キュレーター",badge:selected.length||null},
    {id:"pitch",icon:"△",label:"ピッチ作成",badge:null},
    {id:"tracking",icon:"◐",label:"トラッキング",badge:myPitches.filter(p=>p.status==="feedback").length||null},
    {id:"analytics",icon:"◫",label:"分析",badge:null},
  ];

  return <>
    <nav style={css.nav}>
      <div style={css.navBrand}>OTONAMI</div>
      <div style={{display:"flex",gap:4,flex:1,justifyContent:"center"}}>
        {navItems.map(n => <button key={n.id} onClick={()=>setPage(n.id)} style={{...css.navBtn,...(page===n.id?css.navBtnActive:{})}}>{n.icon} {n.label}{n.badge && <span style={css.navBadge}>{n.badge}</span>}</button>)}
      </div>
      <div style={{fontSize:"0.75rem",color:"#6b6560"}}>
        <span style={{color:"#f59e0b",fontWeight:700}}>{credits}</span> クレジット
        <button onClick={()=>setPage("shop")} style={{marginLeft:8,...css.btnSm,background:"linear-gradient(135deg,rgba(245,158,11,0.15),rgba(234,88,12,0.1))",color:"#f59e0b",border:"1px solid rgba(245,158,11,0.3)",fontWeight:600}}>+ 購入</button>
      </div>
    </nav>
    <main style={css.main}>
      {page==="dashboard" && <ArtistDash user={user} pitches={myPitches} curators={curators} credits={credits} setPage={setPage} notify={notify}/>}
      {page==="curators" && <CuratorBrowser curators={curators} selected={selected} setSelected={setSelected} setPage={setPage} trackData={trackData} setTrackData={setTrackData} notify={notify} artist={artist}/>}
      {page==="pitch" && <PitchCreator user={user} curators={curators} selected={selected} setSelected={setSelected} pitches={pitches} savePitches={savePitches} credits={credits} saveCredits={saveCredits} notify={notify} setPage={setPage} setTrackData={setTrackData} trackData={trackData} artist={artist} setArtist={setArtist} links={links} setLinks={setLinks} followers={followers} setFollowers={setFollowers} clearArtistDraft={clearArtistDraft}/>}
      {page==="tracking" && <Tracking pitches={myPitches} curators={curators} notify={notify} savePitches={savePitches} allPitches={pitches} refreshPitches={refreshPitches}/>}
      {page==="analytics" && <Analytics pitches={myPitches}/>}
      {page==="shop" && <CreditShop user={user} credits={credits} saveCredits={saveCredits} notify={notify} setPage={setPage}/>}
    </main>
    <footer style={{borderTop:"1px solid rgba(0,0,0,0.05)",padding:"1.2rem 1.5rem",textAlign:"center",background:"#f8f7f4",fontSize:"0.72rem",color:"#9a958e"}}>
      OTONAMI — Connecting Japanese Music to the World | TYCompany LLC / ILCJ
    </footer>
  </>;
}

// ─── Artist Dashboard ───
function ArtistDash({user, pitches, curators, credits, setPage, notify}) {
  const acc = pitches.filter(p=>p.status==="accepted").length;
  const fb = pitches.filter(p=>["feedback","accepted","declined"].includes(p.status)).length;
  const listened = pitches.filter(p=>["listened","feedback","accepted","declined"].includes(p.status)).length;
  const recent = [...pitches].sort((a,b) => {
    const ta = b.feedbackAt||b.listenedAt||b.openedAt||b.sentAt||"";
    const tb = a.feedbackAt||a.listenedAt||a.openedAt||a.sentAt||"";
    return ta > tb ? 1 : -1;
  }).slice(0, 5);
  const statusIcon = {sent:"📤",opened:"👁",listened:"🎧",feedback:"💬",accepted:"🎉",declined:"📋",expired:"⏰"};
  const statusLabel = {sent:"送信済",opened:"開封済",listened:"試聴中",feedback:"FB受信",accepted:"採用！",declined:"不採用",expired:"期限切れ"};

  return <div style={{maxWidth:1100,margin:"0 auto"}}>
    <style>{`
      .dash-stat{transition:all 0.2s ease;cursor:default}
      .dash-stat:hover{border-color:#c4956a !important;transform:translateY(-1px);box-shadow:0 2px 8px rgba(0,0,0,0.08)}
      .dash-step{transition:all 0.2s ease}
      .dash-step:hover{border-color:#c4956a !important;transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.08)}
      .dash-activity:hover{background:rgba(0,0,0,0.02)}
      @media(max-width:768px){.dash-steps-grid{grid-template-columns:repeat(2,1fr) !important}.dash-stats-grid{grid-template-columns:repeat(2,1fr) !important}}
      @media(max-width:480px){.dash-steps-grid{grid-template-columns:1fr !important}}
    `}</style>

    {/* Header */}
    <div style={{marginBottom:24}}>
      <h1 style={{fontSize:28,fontWeight:600,margin:0,fontFamily:"'Playfair Display',Georgia,serif",color:"#1a1a1a"}}>おかえりなさい、{user.name}</h1>
      <p style={{color:"#6b6560",margin:"6px 0 0",fontSize:15,fontFamily:"'DM Sans',sans-serif"}}>日本の音楽を世界へ届けましょう</p>
    </div>

    {/* Welcome Guide — only when 0 pitches */}
    {pitches.length === 0 && (
      <div style={{background:"linear-gradient(135deg,rgba(196,149,106,0.06),rgba(196,149,106,0.03))",border:"1px solid rgba(196,149,106,0.15)",borderRadius:16,padding:"28px 32px",marginBottom:24}}>
        <div style={{fontSize:28,marginBottom:4}}>👋</div>
        <h3 style={{fontFamily:"'Playfair Display',Georgia,serif",color:"#1a1a1a",fontSize:22,fontWeight:600,margin:"0 0 8px"}}>はじめましょう！</h3>
        <p style={{color:"#6b6560",fontSize:14,margin:"0 0 16px",lineHeight:1.6,fontFamily:"'DM Sans',sans-serif"}}>まずは「キュレーター検索」から、あなたの音楽に合う海外メディアを探してみましょう。</p>
        <button onClick={()=>setPage("curators")} style={{background:"linear-gradient(135deg,#c4956a,#b8845e)",color:"#1a1a1a",padding:"10px 28px",borderRadius:10,fontWeight:600,border:"none",cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.background="linear-gradient(135deg,#d4a57a,#c4956a)";e.currentTarget.style.boxShadow="0 4px 12px rgba(196,149,106,0.3)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="linear-gradient(135deg,#c4956a,#b8845e)";e.currentTarget.style.boxShadow="none";}}
        >キュレーターを探す →</button>
      </div>
    )}

    {/* Stats Cards */}
    <div className="dash-stats-grid" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:24}}>
      {[{v:credits,l:"クレジット残",c:"#c4956a",sub:""},{v:pitches.length,l:"送信済み",c:"#1a1a1a",sub:"キュレーターに送った数"},{v:listened,l:"試聴済み",c:"#60a5fa",sub:"曲を聴いてもらえた数"},{v:fb,l:"FB受信",c:"#c084fc",sub:"フィードバックをもらった数"},{v:acc,l:"採用",c:"#34d399",sub:"プレイリストやブログに採用された数"}].map((s,i) =>
        <div key={i} className="dash-stat" style={{background:"#ffffff",borderRadius:14,padding:20,border:"1px solid #e5e2dc",textAlign:"center"}}>
          <div style={{fontSize:32,fontWeight:700,color:s.c,fontFamily:"'Playfair Display',Georgia,serif",lineHeight:1}}>{s.v}</div>
          <div style={{fontSize:12,color:"#6b6560",marginTop:8,fontFamily:"'DM Sans',sans-serif"}}>{s.l}</div>
          {s.sub && <div style={{fontSize:11,color:"rgba(184,176,163,0.6)",marginTop:4,fontFamily:"'DM Sans',sans-serif"}}>{s.sub}</div>}
        </div>
      )}
    </div>

    {/* Credit Balance */}
    <div onClick={()=>setPage("shop")} style={{background:"linear-gradient(135deg,rgba(196,149,106,0.12),rgba(196,149,106,0.05))",border:"1px solid rgba(196,149,106,0.25)",borderRadius:14,padding:"16px 24px",marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"border-color 0.2s"}}
      onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(196,149,106,0.45)"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(196,149,106,0.25)"}>
      <div>
        <div style={{fontWeight:500,fontSize:15,color:"#1a1a1a",fontFamily:"'DM Sans',sans-serif"}}>💰 クレジット残高: {credits}</div>
        <div style={{fontSize:12,color:"#6b6560",marginTop:2,fontFamily:"'DM Sans',sans-serif"}}>1クレジット = ¥160 · キュレーターにより1〜4cr</div>
      </div>
      <div style={{background:"#c4956a",color:"#1a1a1a",fontSize:13,fontWeight:600,padding:"8px 20px",borderRadius:8,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>+ 購入する →</div>
    </div>

    {/* Quick Actions — always visible */}
    <div style={{display:"flex",gap:12,marginBottom:24,justifyContent:"center"}}>
      <button onClick={()=>setPage("curators")} style={{background:"linear-gradient(135deg,#c4956a,#b8845e)",color:"#1a1a1a",padding:"12px 28px",borderRadius:10,border:"none",fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>🎯 キュレーターを探す</button>
      <button onClick={()=>setPage("pitch")} style={{background:"transparent",color:"#1a1a1a",padding:"12px 28px",borderRadius:10,border:"1px solid #e5e2dc",fontWeight:500,fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>✉️ ピッチを作成</button>
    </div>

    {/* Flow indicator */}
    <div style={{textAlign:"center",margin:"4px 0 16px",fontSize:13,color:"#6b6560",letterSpacing:"0.5px",fontFamily:"'DM Sans',sans-serif"}}>
      <span style={{fontWeight:600,color:"#1a1a1a"}}>使い方はかんたん</span>
      <span style={{margin:"0 8px",opacity:0.4}}>──</span>
      <span>4つのステップ</span>
    </div>

    {/* Step Cards */}
    <div className="dash-steps-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
      {[{icon:"◎",title:"キュレーター検索",desc:"あなたの曲に合う海外メディアを探す",p:"curators",step:1},{icon:"△",title:"AIピッチ生成",desc:"AIが英語の紹介文を自動作成",p:"pitch",step:2},{icon:"◐",title:"トラッキング",desc:"開封・試聴・フィードバックを確認",p:"tracking",step:3},{icon:"◫",title:"分析",desc:"あなたの成果を可視化",p:"analytics",step:4}].map((a,i) =>
        <div key={i} className="dash-step" onClick={()=>setPage(a.p)} style={{background:"#ffffff",borderRadius:14,padding:"24px 20px",border:"1px solid #e5e2dc",cursor:"pointer"}}>
          <div style={{fontSize:10,fontWeight:600,color:"#c4956a",letterSpacing:"1.5px",marginBottom:12,fontFamily:"'DM Sans',sans-serif"}}>STEP {a.step}</div>
          <div style={{fontSize:24,marginBottom:8}}>{a.icon}</div>
          <div style={{fontWeight:500,fontSize:15,color:"#1a1a1a",marginBottom:4,fontFamily:"'DM Sans',sans-serif"}}>{a.title}</div>
          <div style={{fontSize:13,color:"#6b6560",lineHeight:1.5,fontFamily:"'DM Sans',sans-serif"}}>{a.desc}</div>
        </div>
      )}
    </div>

    {/* Recent Activity Feed */}
    {recent.length > 0 && <div style={{borderTop:"1px solid #e5e2dc",paddingTop:20}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:12,color:"#6b6560",letterSpacing:"0.5px",textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>📋 最近のアクティビティ</div>
      <div>
        {recent.map((p,i) => (
          <div key={p.id} className="dash-activity" style={{padding:"12px 0",borderBottom:i<recent.length-1?"1px solid rgba(58,58,58,0.5)":"none",display:"flex",alignItems:"center",gap:10,transition:"background 0.15s",borderRadius:4}}>
            <span style={{fontSize:16}}>{statusIcon[p.status]||"📤"}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:500,color:"#1a1a1a",fontFamily:"'DM Sans',sans-serif"}}>{p.curatorName} <span style={{fontWeight:400,color:"#6b6560"}}>— {statusLabel[p.status]||p.status}</span></div>
              <div style={{fontSize:13,color:"#6b6560",fontFamily:"'DM Sans',sans-serif"}}>{p.artistName} "{p.songTitle}"</div>
            </div>
            <div style={{fontSize:12,color:"#6b6560",opacity:0.6,fontFamily:"'DM Sans',sans-serif"}}>{timeAgo(p.feedbackAt||p.listenedAt||p.openedAt||p.sentAt)}</div>
          </div>
        ))}
      </div>
    </div>}
  </div>;
}

// ─── Embed Player Helper ───
// Returns { type: 'spotify'|'youtube', id } or null
function getEmbedInfo(url) {
  if (!url) return null;
  const sp = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (sp) return { type: 'spotify', id: sp[1] };
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (yt) return { type: 'youtube', id: yt[1] };
  return null;
}

// Extract song title from a YouTube video title string
function parseYTTitle(title, authorName) {
  if (!title) return '';
  // Quoted title: 'ROUTE14band "Mahal" MV' → 'Mahal'  (double or Japanese quotes)
  const q = title.match(/[「"'"]([^「"'"]{1,60})[」"'"]/);
  if (q) return q[1].trim();
  // Dash pattern: "Artist - Song (Official Video)" → "Song"
  const dash = title.match(/^.+?[-–—]\s*(.+?)(?:\s*[\(\[（【]|$)/);
  if (dash) {
    const candidate = dash[1].replace(/\s*(Official|Music\s*Video|MV|Audio|Lyric|Live|PV|Short)\s*/gi, '').trim();
    if (candidate) return candidate;
  }
  // Strip author name and common suffixes, return remainder
  let t = title;
  if (authorName) t = t.replace(new RegExp(authorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  t = t
    .replace(/\s*[\(\[（【].*?[\)\]）】]/g, '')
    .replace(/\s*(Official|Music\s*Video|MV|Audio|Lyric|Live|PV|Short)\s*/gi, ' ')
    .replace(/[-+,\s]+$/, '')
    .trim();
  return t;
}

// ─── Curator Browser ───
function CuratorBrowser({curators, selected, setSelected, setPage, trackData, setTrackData, notify, artist}) {
  const [q, setQ] = useState(""); const [genre, setGenre] = useState(""); const [type, setType] = useState("");
  const [sortByMatch, setSortByMatch] = useState(false);
  const [detailCurator, setDetailCurator] = useState(null);
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setDetailCurator(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    document.body.style.overflow = detailCurator ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [detailCurator]);
  // Auto-enable match sorting when artist genre is already filled
  useEffect(() => { if (artist?.genre) setSortByMatch(true); }, [artist?.genre]);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [detectedSong, setDetectedSong] = useState(trackData?.songName || "");
  const [detectedArtist, setDetectedArtist] = useState(trackData?.artistName || "");
  const [analyzeUrl, setAnalyzeUrl] = useState("");
  const analyzeUrlRef = useRef(analyzeUrl);
  useEffect(() => { analyzeUrlRef.current = analyzeUrl; }, [analyzeUrl]);

  const resolveGenreMood = (artistName) => {
    if (artist?.genre) return { genre: artist.genre, mood: artist.mood || '' };
    const demo = DEMO_ARTISTS.find(d =>
      d.name.toLowerCase() === (artistName||'').toLowerCase() ||
      d.nameEn?.toLowerCase() === (artistName||'').toLowerCase()
    );
    if (demo) return { genre: demo.genre, mood: demo.mood || '' };
    return { genre: '', mood: '' };
  };

  const runAnalyze = async (song, artistName) => {
    setAnalyzeLoading(true);
    const currentUrl = analyzeUrlRef.current.trim() || null;
    const fallback = resolveGenreMood(artistName);
    try {
      const result = await analyzeTrack({ songName: song, artistName });
      setTrackData({ ...result, songName: song, artistName, notInDb: false, listeningUrl: currentUrl, genre: result.genre || fallback.genre, mood: result.mood || fallback.mood });
      setSortByMatch(true);
    } catch (e) {
      // Not in SoundNet DB — fall back to genre+mood scoring
      setTrackData({ songName: song, artistName, audioFeatures: null, notInDb: true, source: 'manual', listeningUrl: currentUrl, genre: fallback.genre, mood: fallback.mood });
      setSortByMatch(true);
    }
    setAnalyzeLoading(false);
  };

  const doAnalyze = () => {
    const song = detectedSong.trim();
    if (!song) { notify("⚠️ 曲名を入力してください"); return; }
    runAnalyze(song, detectedArtist.trim());
  };

  // Auto-trigger SoundNet when both song + artist are filled (1.5s debounce)
  const lastAnalyzedKeyRef = useRef('');
  useEffect(() => {
    const song = detectedSong.trim();
    const artistName = detectedArtist.trim();
    if (!song || !artistName) return;
    const key = song + '|' + artistName;
    if (key === lastAnalyzedKeyRef.current) return;
    const timer = setTimeout(() => {
      lastAnalyzedKeyRef.current = key;
      runAnalyze(song, artistName);
    }, 1500);
    return () => clearTimeout(timer);
  }, [detectedSong, detectedArtist]);

  // Sync analyzeUrl to trackData.listeningUrl in real-time
  useEffect(() => {
    if (!trackData) return;
    const url = analyzeUrl.trim();
    if (url !== (trackData.listeningUrl || '')) {
      setTrackData(prev => prev ? {...prev, listeningUrl: url || null} : prev);
    }
  }, [analyzeUrl]);

  // Build effective track: merge artist genre/mood into trackData (or use artist alone for initial ranking)
  const effectiveTrack = useMemo(() => {
    const trackGenre = trackData?.genre || artist?.genre || '';
    const mood       = trackData?.mood  || artist?.mood  || '';
    if (!trackGenre && !trackData?.audioFeatures) return null;
    return { ...trackData, genre: trackGenre, mood };
  }, [trackData, artist]);

  // Always score curators when effectiveTrack is available (for badge display)
  const scoredCurators = useMemo(() => {
    if (!effectiveTrack) return curators;
    const scored = rankCurators(curators, effectiveTrack);
    const byId = Object.fromEntries(scored.map(c => [c.id, c]));
    return curators.map(c => byId[c.id] || c);
  }, [curators, effectiveTrack]);

  // sortByMatch controls ORDER only, not score visibility
  const ranked = useMemo(() => {
    if (!sortByMatch) return scoredCurators;
    return [...scoredCurators].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }, [scoredCurators, sortByMatch]);

  const list = ranked.filter(c=>!q||c.name.toLowerCase().includes(q.toLowerCase())||c.platform.toLowerCase().includes(q.toLowerCase())).filter(c=>!genre||c.genres.includes(genre)).filter(c=>!type||c.type===type);
  const toggle = id => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const matchColor = (score) => score >= 85 ? "#16a34a" : score >= 70 ? "#2563eb" : score >= 50 ? "#0ea5e9" : score >= 30 ? "#d97706" : "#dc2626";

  return <div>
    <style>{`.curator-list-card { flex-direction: row !important; } @media (max-width: 480px) { .curator-list-card { flex-direction: column !important; } } @media (max-width: 768px) { .pitch-step-labels { display: none !important; } } @keyframes curatorModalIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
    <div style={{marginBottom:"1.2rem"}}>
      <div style={{fontSize:11,letterSpacing:"2px",color:"#6b6560",marginBottom:6,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>CURATORS</div>
      <h1 style={{fontSize:28,fontWeight:800,margin:0,fontFamily:"'Playfair Display',Georgia,serif",color:"#1a1a1a",lineHeight:1.1}}>あなたの曲に合うメディアを探そう</h1>
      <p style={{color:"#6b6560",fontSize:14,margin:"8px 0 0",fontFamily:"'DM Sans',sans-serif",lineHeight:1.5}}>曲名とアーティスト名を入力すると、AIがマッチ度を自動計算します {selected.length > 0 && <span style={{color:"#c4956a",fontWeight:600}}>· {selected.length}人選択中</span>}</p>
    </div>

    {/* ── Track Analysis Section ── */}
    <div style={{background:"linear-gradient(135deg, rgba(196,149,106,0.06), rgba(196,149,106,0.03))",borderRadius:16,padding:24,marginBottom:"1rem",border:"1px solid rgba(196,149,106,0.25)"}}>
      <div style={{fontSize:16,fontWeight:500,color:"#1a1a1a",marginBottom:4,fontFamily:"'DM Sans',sans-serif"}}>🎵 まず、あなたの楽曲を教えてください</div>
      <div style={{fontSize:13,color:"#6b6560",marginBottom:12,fontFamily:"'DM Sans',sans-serif"}}>曲名とアーティスト名を入力して「分析する」を押すと、各キュレーターとのマッチ度がわかります</div>
      {/* Input row — always visible so user can re-enter */}
      <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
        <input style={{...css.input,border:"1px solid rgba(196,149,106,0.3)",background:"#ffffff",flex:1,fontSize:15,height:44,padding:"0 12px",marginBottom:0}} placeholder="例: Sepia" value={detectedSong} onChange={e=>setDetectedSong(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doAnalyze()}/>
        <input style={{...css.input,border:"1px solid rgba(196,149,106,0.3)",background:"#ffffff",flex:1,fontSize:15,height:44,padding:"0 12px",marginBottom:0}} placeholder="例: ROUTE14band" value={detectedArtist} onChange={e=>setDetectedArtist(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doAnalyze()}/>
        <button onClick={doAnalyze} disabled={analyzeLoading||!detectedSong} style={{background:analyzeLoading?"#e5e2dc":"#c4956a",color:analyzeLoading?"#9a958e":"#f8f7f4",border:"none",fontWeight:600,whiteSpace:"nowrap",flexShrink:0,opacity:!detectedSong?0.5:1,padding:"10px 20px",borderRadius:10,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
          {analyzeLoading ? "分析中…" : "🔍 分析する"}
        </button>
      </div>
      <input style={{...css.input,border:"1px solid rgba(196,149,106,0.3)",background:"#ffffff",fontSize:15,height:44,padding:"0 12px",marginBottom:2}} placeholder="楽曲のURL（YouTube / Spotify）" value={analyzeUrl} onChange={e=>setAnalyzeUrl(e.target.value)}/>
      <div style={{fontSize:12,color:"#6b6560",opacity:0.6,fontFamily:"'DM Sans',sans-serif"}}>※ キュレーターがあなたの曲を聴くためのリンクです</div>
      {trackData && !trackData.audioFeatures && !trackData.genre && !artist?.genre && (
        <div style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
          <input style={{...css.input,border:"1px solid #f59e0b",background:"#fffbeb",flex:1,fontSize:"0.78rem"}} placeholder="ジャンル（例: Jazz, Funk, Latin）" onKeyDown={e=>{
            if(e.key==="Enter"&&e.target.value.trim()){
              setTrackData(prev=>({...prev, genre:e.target.value.trim()}));
            }
          }} onBlur={e=>{
            if(e.target.value.trim()){
              setTrackData(prev=>({...prev, genre:e.target.value.trim()}));
            }
          }}/>
          <span style={{fontSize:"0.62rem",color:"#92400e",flexShrink:0}}>Enter または入力後クリックで確定</span>
        </div>
      )}
      {/* Result line */}
      {analyzeLoading && <div style={{fontSize:"0.72rem",color:"#c4956a"}}>🔍 SoundNet検索中…</div>}
      {!analyzeLoading && trackData && (() => {
        const af = trackData.audioFeatures;
        const level = v => v >= 0.67 ? '高' : v >= 0.33 ? '中' : '低';
        const genres = trackData.genre || artist?.genre || '';
        return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
          {af ? (
            <span style={{fontSize:"0.72rem",color:"#15803d",fontWeight:600}}>
              ✅ SoundNet分析完了: {af.tempo!=null && `Tempo ${Math.round(af.tempo)}BPM`}{af.energy!=null && ` / Energy ${level(af.energy)}`}{af.danceability!=null && ` / Danceability ${level(af.danceability)}`}
            </span>
          ) : (
            <span style={{fontSize:"0.72rem",color:genres?"#15803d":"#b45309",fontWeight:600}}>
              {genres ? `✅ ジャンル(${genres})でマッチスコア計算中` : '⚠️ DBに未登録 — ピッチ作成画面でジャンルを入力するとマッチスコアが計算されます'}
            </span>
          )}
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button onClick={()=>setSortByMatch(p=>!p)} style={{...css.btnSm,background:sortByMatch?"#c4956a":"#f0ede6",color:sortByMatch?"#fff":"#6b6560",border:"1px solid "+(sortByMatch?"#c4956a":"rgba(0,0,0,0.06)"),fontWeight:600,fontSize:"0.68rem"}}>
              {sortByMatch ? "🎯 マッチ順" : "🎯 マッチ順で並べる"}
            </button>
            <button onClick={()=>{setTrackData(null);setDetectedSong("");setDetectedArtist("");lastAnalyzedKeyRef.current="";setSortByMatch(false);}} style={{fontSize:"0.62rem",color:"#9a958e",background:"none",border:"1px solid rgba(0,0,0,0.06)",borderRadius:6,padding:"0.2rem 0.5rem",cursor:"pointer"}}>✕</button>
          </div>
        </div>;
      })()}
      {!analyzeLoading && !trackData && artist?.genre && (
        <div style={{fontSize:"0.72rem",color:"#c4956a"}}>✅ ジャンル設定済み（{artist.genre}）— 分析なしでもスコア表示中</div>
      )}
    </div>

    <div style={{display:"flex",gap:12,marginBottom:"1rem",flexWrap:"wrap"}}>
      <div style={{position:"relative",flex:"1 1 150px",minWidth:120}}>
        <span style={{position:"absolute",left:"0.7rem",top:"50%",transform:"translateY(-50%)",fontSize:"0.85rem",pointerEvents:"none",color:"#9a958e"}}>🔍</span>
        <input style={{...css.filterInput,flex:"unset",width:"100%",paddingLeft:"2rem",boxSizing:"border-box",fontSize:14,height:40}} placeholder="名前・プラットフォームで検索..." value={q} onChange={e=>setQ(e.target.value)}/>
      </div>
      <select style={{...css.filterSelect,flex:"1 1 120px",fontSize:14,height:40}} value={genre} onChange={e=>setGenre(e.target.value)}><option value="">全ジャンル</option>{GENRES.map(g=><option key={g}>{g}</option>)}</select>
      <select style={{...css.filterSelect,flex:"1 1 120px",fontSize:14,height:40}} value={type} onChange={e=>setType(e.target.value)}><option value="">全タイプ</option>{CURATOR_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select>
    </div>
    {selected.length > 0 && <div style={{background:"rgba(196,149,106,0.08)",border:"1px solid rgba(196,149,106,0.4)",borderRadius:12,padding:"0.6rem 1rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:"0.82rem",color:"#c4956a",fontWeight:600}}>{selected.length}人選択中 · 合計{curators.filter(c=>selected.includes(c.id)).reduce((s,c)=>s+(c.creditCost||2),0)}cr (¥{curators.filter(c=>selected.includes(c.id)).reduce((s,c)=>s+(c.creditCost||2),0)*160})</span><div style={{display:"flex",gap:6}}><button onClick={()=>setPage("pitch")} style={{...css.btnPrimary,fontSize:"0.75rem",padding:"0.4rem 0.8rem"}}>🚀 ピッチ作成へ</button><button onClick={()=>setSelected([])} style={{...css.btnSm,color:"#ef4444"}}>クリア</button></div></div>}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {(() => {
        const avatarColors = [
          {bg:'rgba(196,149,106,0.15)',text:'#c4956a'},
          {bg:'rgba(232,93,58,0.15)',text:'#e85d3a'},
          {bg:'rgba(74,222,128,0.12)',text:'#4ade80'},
          {bg:'rgba(96,165,250,0.12)',text:'#60a5fa'},
          {bg:'rgba(251,191,36,0.12)',text:'#fbbf24'},
          {bg:'rgba(168,85,247,0.12)',text:'#a855f7'},
        ];
        const typeBadgeMap = {
          blog:       {bg:'rgba(96,165,250,0.12)',text:'#60a5fa',label:'📝 Blog'},
          playlist:   {bg:'rgba(74,222,128,0.12)',text:'#4ade80',label:'🎵 Playlist'},
          radio:      {bg:'rgba(251,191,36,0.12)',text:'#fbbf24',label:'📻 Radio'},
          label:      {bg:'rgba(168,85,247,0.12)',text:'#a855f7',label:'💿 Label'},
          management: {bg:'rgba(232,93,58,0.12)',text:'#e85d3a',label:'🤝 Mgmt'},
          publisher:  {bg:'rgba(96,165,250,0.12)',text:'#60a5fa',label:'📚 Publisher'},
        };
        const regionFlags = {'Japan':'🇯🇵','US':'🇺🇸','USA':'🇺🇸','UK':'🇬🇧','France':'🇫🇷','Germany':'🇩🇪','Australia':'🇦🇺','Global':'🌍'};
        const msColor = (score) => score >= 85 ? '#4ade80' : score >= 70 ? '#60a5fa' : '#fbbf24';
        const circumference = 113;
        return list.map(c => {
          const on = selected.includes(c.id);
          const ms = c.matchScore;
          const ml = ms != null ? getMatchLabel(ms) : null;
          const colorIdx = c.name.charCodeAt(0) % avatarColors.length;
          const av = avatarColors[colorIdx];
          const initials = c.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
          const typeBadge = typeBadgeMap[c.type];
          const flag = c.region ? (regionFlags[c.region] || null) : null;
          return <div key={c.id} onClick={()=>setDetailCurator(c)} className="curator-list-card" style={{background:on?'rgba(196,149,106,0.08)':'#ffffff',border:on?'1px solid rgba(196,149,106,0.4)':'1px solid rgba(0,0,0,0.05)',borderRadius:12,padding:'20px',display:'flex',gap:16,alignItems:'flex-start',cursor:'pointer',transition:'all 0.2s ease'}}>
            {/* Avatar */}
            <div style={{width:48,height:48,borderRadius:'50%',flexShrink:0,position:'relative',overflow:'hidden'}}>
              {c.iconUrl && <img src={c.iconUrl} alt={c.name} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%',border:'2px solid rgba(0,0,0,0.06)'}} onError={e=>{e.target.style.display='none';}} />}
              <div style={{width:'100%',height:'100%',borderRadius:'50%',background:on?'linear-gradient(135deg,#c4956a,#e85d3a)':av.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:600,color:on?'#fff':av.text,letterSpacing:'-0.5px'}}>{initials}</div>
            </div>
            {/* Info */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                <span style={{fontSize:16,fontWeight:600,color:'#1a1a1a'}}>{c.name}</span>
                {flag && <span style={{fontSize:14}}>{flag}</span>}
                {typeBadge && <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,background:typeBadge.bg,color:typeBadge.text,fontWeight:500}}>{typeBadge.label}</span>}
                {c.badges?.map(b => <span key={b} style={{fontSize:'0.6rem',padding:'0.1rem 0.4rem',borderRadius:6,background:b==='verified'?'#dcfce7':'#eff6ff',color:b==='verified'?'#16a34a':'#2563eb'}}>{BADGES[b]}</span>)}
              </div>
              <div style={{fontSize:'0.75rem',color:'#9a958e',marginBottom:6}}>{c.platform}{c.audience ? ' · '+(c.audience>=1000?(c.audience/1000).toFixed(1)+'K':c.audience) : ''}</div>
              {c.bio && <p style={{fontSize:14,color:'#9a958e',margin:'0 0 10px',lineHeight:1.5}}>{c.bio.length>80?c.bio.substring(0,80)+'…':c.bio}</p>}
              {ml && c.matchReasons?.length > 0 && <div style={{fontSize:'0.62rem',color:'#c4956a',marginBottom:8}}>{c.matchReasons.slice(0,2).join(' · ')}</div>}
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {c.genres.slice(0,4).map(g => <span key={g} style={{fontSize:12,padding:'4px 10px',borderRadius:20,background:'rgba(196,149,106,0.06)',border:'1px solid rgba(196,149,106,0.1)',color:'#c4956a'}}>{g}</span>)}
                {c.genres.length > 4 && <span style={{fontSize:'0.62rem',color:'#9a958e',alignSelf:'center'}}>+{c.genres.length-4}</span>}
              </div>
            </div>
            {/* Right: match gauge + select button */}
            <div onClick={e=>{e.stopPropagation();toggle(c.id);}} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,flexShrink:0,borderRadius:10,padding:'6px',transition:'background 0.15s',cursor:'pointer'}} title={on?'選択解除':'選択する'}>
              {ms != null ? (
                <div style={{position:'relative',width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="44" height="44" style={{position:'absolute',transform:'rotate(-90deg)'}}>
                    <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="3"/>
                    <circle cx="22" cy="22" r="18" fill="none" stroke={msColor(ms)} strokeWidth="3" strokeDasharray={`${(ms/100)*circumference} ${circumference}`} strokeLinecap="round"/>
                  </svg>
                  <span style={{fontSize:14,fontWeight:600,color:msColor(ms)}}>{ms}%</span>
                </div>
              ) : (
                <div style={{width:44,height:44}}/>
              )}
              <span style={{fontSize:14,color:'#c4956a',fontWeight:600}}>{c.creditCost||2} cr</span>
              <div style={{width:22,height:22,borderRadius:'50%',background:on?'#c4956a':'rgba(0,0,0,0.06)',border:on?'none':'1px solid rgba(0,0,0,0.1)',color:on?'#fff':'#9a958e',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.68rem',fontWeight:700,transition:'all 0.15s'}}>{on?'✓':'+'}</div>
            </div>
          </div>;
        });
      })()}
    </div>
    {/* Floating action bar when curators selected */}
    {selected.length > 0 && <div style={{position:"sticky",bottom:0,left:0,right:0,background:"linear-gradient(0deg,#f8f7f4 70%,transparent)",padding:"1rem 0 0.5rem",marginTop:"0.5rem"}}>
      <button onClick={()=>setPage("pitch")} style={{...css.btnPrimary,width:"100%",padding:"0.9rem",fontSize:"0.95rem"}}>🚀 {selected.length}人のキュレーターにピッチ作成 ({curators.filter(c=>selected.includes(c.id)).reduce((s,c)=>s+(c.creditCost||2),0)}cr)</button>
    </div>}

    {/* Curator Detail Modal */}
    {detailCurator && (() => {
      const dc = detailCurator;
      const dcOn = selected.includes(dc.id);
      const dcMs = dc.matchScore;
      const dcMsColor = dcMs >= 85 ? '#4ade80' : dcMs >= 70 ? '#60a5fa' : '#fbbf24';
      const dcAv = [{bg:'rgba(196,149,106,0.15)',text:'#c4956a'},{bg:'rgba(232,93,58,0.15)',text:'#e85d3a'},{bg:'rgba(74,222,128,0.12)',text:'#4ade80'},{bg:'rgba(96,165,250,0.12)',text:'#60a5fa'},{bg:'rgba(251,191,36,0.12)',text:'#fbbf24'},{bg:'rgba(168,85,247,0.12)',text:'#a855f7'}][dc.name.charCodeAt(0) % 6];
      const dcInitials = dc.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
      const dcFollowers = dc.followers || dc.audience;
      const artistGenres = (artist?.genre || '').split(',').map(g => g.trim().toLowerCase()).filter(Boolean);
      const matchingGenres = artistGenres.length > 0
        ? (dc.genres || []).filter(g => artistGenres.includes(g.toLowerCase()))
        : [];
      return <div onClick={()=>setDetailCurator(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div onClick={e=>e.stopPropagation()} style={{background:'#ffffff',borderRadius:16,border:'1px solid rgba(0,0,0,0.06)',maxWidth:560,width:'100%',maxHeight:'90vh',overflowY:'auto',animation:'curatorModalIn 0.2s ease'}}>

          {/* Header */}
          <div style={{padding:'24px 24px 20px',borderBottom:'1px solid rgba(0,0,0,0.05)',display:'flex',alignItems:'center',gap:16}}>
            <div style={{width:64,height:64,borderRadius:'50%',flexShrink:0,position:'relative',overflow:'hidden'}}>
              {dc.iconUrl && <img src={dc.iconUrl} alt={dc.name} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.target.style.display='none';}}/>}
              <div style={{width:'100%',height:'100%',borderRadius:'50%',background:dcAv.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:600,color:dcAv.text}}>{dcInitials}</div>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <h3 style={{fontSize:20,fontWeight:500,color:'#1a1a1a',fontFamily:"'Playfair Display',Georgia,serif",margin:'0 0 4px'}}>{dc.name}</h3>
              <div style={{fontSize:13,color:'#9a958e'}}>
                {dc.platform}{dcFollowers ? ' · '+(dcFollowers>=1000?(dcFollowers/1000).toFixed(1)+'K followers':dcFollowers+' followers') : ''}
              </div>
            </div>
            <button onClick={()=>setDetailCurator(null)} style={{background:'transparent',border:'none',color:'#9a958e',fontSize:24,cursor:'pointer',padding:4,lineHeight:1,flexShrink:0}}>×</button>
          </div>

          {/* Body */}
          <div style={{padding:'24px',display:'flex',flexDirection:'column',gap:24}}>

            {/* Match section */}
            {(dcMs != null || matchingGenres.length > 0) && <div style={{background:dcMs!=null?(dcMs>=85?'rgba(74,222,128,0.06)':dcMs>=70?'rgba(96,165,250,0.06)':'rgba(251,191,36,0.06)'):'rgba(255,255,255,0.03)',borderRadius:12,padding:16,border:'1px solid '+(dcMs!=null?(dcMs>=85?'rgba(74,222,128,0.15)':dcMs>=70?'rgba(96,165,250,0.15)':'rgba(251,191,36,0.15)'):'rgba(0,0,0,0.05)')}}>
              {dcMs != null && <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:matchingGenres.length>0?12:0}}>
                <div style={{fontSize:32,fontWeight:600,color:dcMsColor,lineHeight:1}}>{dcMs}%</div>
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:'#1a1a1a'}}>Match Score</div>
                  {dc.matchReasons?.length > 0 && <div style={{fontSize:12,color:'#9a958e',marginTop:2}}>{dc.matchReasons.join(' · ')}</div>}
                </div>
              </div>}
              {matchingGenres.length > 0 && <div>
                <div style={{fontSize:12,color:'#9a958e',marginBottom:8}}>How well you match</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {matchingGenres.map((g,i) => <span key={i} style={{background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80',padding:'4px 12px',borderRadius:20,fontSize:12}}>✓ {g}</span>)}
                </div>
              </div>}
            </div>}

            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              <div style={{background:'#ffffff',borderRadius:10,padding:'14px 10px',textAlign:'center'}}>
                <div style={{fontSize:20,fontWeight:600,color:'#1a1a1a'}}>
                  {(dc.pitchesResponded && dc.pitchesReceived) ? Math.round((dc.pitchesResponded/dc.pitchesReceived)*100)+'%' : '--'}
                </div>
                <div style={{fontSize:11,color:'#9a958e',marginTop:3}}>Answer rate</div>
              </div>
              <div style={{background:'#ffffff',borderRadius:10,padding:'14px 10px',textAlign:'center'}}>
                <div style={{fontSize:20,fontWeight:600,color:'#1a1a1a'}}>
                  {(dc.pitchesAccepted && dc.pitchesResponded) ? Math.round((dc.pitchesAccepted/dc.pitchesResponded)*100)+'%' : '--'}
                </div>
                <div style={{fontSize:11,color:'#9a958e',marginTop:3}}>Share rate</div>
              </div>
              <div style={{background:'#ffffff',borderRadius:10,padding:'14px 10px',textAlign:'center'}}>
                <div style={{fontSize:17,fontWeight:600,color:'#1a1a1a',lineHeight:1.2}}>{dc.responseTime || '7 days'}</div>
                <div style={{fontSize:11,color:'#9a958e',marginTop:3}}>Responds in</div>
              </div>
            </div>

            {/* Bio */}
            {dc.bio && <p style={{fontSize:14,color:'#6b6560',lineHeight:1.7,margin:0}}>{dc.bio}</p>}

            {/* Platform URL */}
            {dc.url && <a href={dc.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{display:'inline-flex',alignItems:'center',gap:6,color:'#c4956a',fontSize:13,textDecoration:'none',wordBreak:'break-all'}}>🔗 {dc.url}</a>}

            {/* Genres they love */}
            {dc.genres?.length > 0 && <div>
              <div style={{fontSize:13,fontWeight:500,color:'#6b6560',marginBottom:10}}>Genres they love</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {dc.genres.map((g,i) => <span key={i} style={{background:'rgba(196,149,106,0.06)',border:'1px solid rgba(196,149,106,0.1)',color:'#c4956a',padding:'4px 12px',borderRadius:20,fontSize:12}}>{g}</span>)}
              </div>
            </div>}

            {/* Genres they don't want */}
            {dc.rejectedGenres?.length > 0 && <div>
              <div style={{fontSize:13,fontWeight:500,color:'#6b6560',marginBottom:10}}>They don't want to receive...</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {dc.rejectedGenres.map((g,i) => <span key={i} style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.15)',color:'#ef4444',padding:'4px 12px',borderRadius:20,fontSize:12}}>{g}</span>)}
              </div>
            </div>}

            {/* Moods they love */}
            {dc.preferredMoods?.length > 0 && <div>
              <div style={{fontSize:13,fontWeight:500,color:'#6b6560',marginBottom:10}}>Moods they love</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {dc.preferredMoods.map((m,i) => <span key={i} style={{background:'rgba(168,85,247,0.08)',border:'1px solid rgba(168,85,247,0.15)',color:'#a855f7',padding:'4px 12px',borderRadius:20,fontSize:12}}>{m}</span>)}
              </div>
            </div>}

            {/* Similar artists */}
            {dc.preferredArtists?.length > 0 && <div>
              <div style={{fontSize:13,fontWeight:500,color:'#6b6560',marginBottom:10}}>They want music similar to...</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {dc.preferredArtists.map((a,i) => <span key={i} style={{background:'#ffffff',border:'1px solid rgba(0,0,0,0.06)',color:'#1a1a1a',padding:'6px 14px',borderRadius:20,fontSize:12}}>🎤 {a}</span>)}
              </div>
            </div>}

            {/* Main opportunities */}
            {(dc.opportunities?.length > 0 || dc.accepts?.length > 0) && <div>
              <div style={{fontSize:13,fontWeight:500,color:'#6b6560',marginBottom:10}}>Main opportunities</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {(dc.opportunities?.length > 0 ? dc.opportunities : dc.accepts).map((o,i) => <div key={i} style={{background:'#ffffff',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#6b6560',border:'1px solid rgba(0,0,0,0.04)'}}>{o}</div>)}
              </div>
            </div>}

            {/* Playlist link */}
            {dc.playlistUrl && <div>
              <div style={{fontSize:13,fontWeight:500,color:'#6b6560',marginBottom:10}}>Their playlist</div>
              <a href={dc.playlistUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{display:'flex',alignItems:'center',gap:10,background:'#ffffff',borderRadius:10,padding:14,color:'#c4956a',textDecoration:'none',fontSize:13,border:'1px solid rgba(0,0,0,0.05)',wordBreak:'break-all'}}>🎵 {dc.playlistUrl}</a>
            </div>}

          </div>

          {/* Footer */}
          <div style={{padding:'16px 24px',borderTop:'1px solid rgba(0,0,0,0.05)',display:'flex',justifyContent:'flex-end',gap:12}}>
            <button onClick={()=>setDetailCurator(null)} style={{background:'transparent',border:'1px solid rgba(255,255,255,0.12)',color:'#6b6560',borderRadius:8,padding:'10px 20px',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>閉じる</button>
            <button onClick={()=>{toggle(dc.id);setDetailCurator(null);}} style={{background:dcOn?'transparent':'#c4956a',border:dcOn?'1px solid #ef4444':'none',color:dcOn?'#ef4444':'#fff',borderRadius:8,padding:'10px 20px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              {dcOn ? '選択解除' : `選択 · ${dc.creditCost||2}cr`}
            </button>
          </div>

        </div>
      </div>;
    })()}
  </div>;
}

// ─── Pitch Creator (Template Engine + Social Links + Followers) ───
function PitchCreator({user, curators, selected, setSelected, pitches, savePitches, credits, saveCredits, notify, setPage, setTrackData, trackData, artist, setArtist, links, setLinks, followers, setFollowers, clearArtistDraft}) {
  const [pitchText, setPitchText] = useState("");
  const [pitchJa, setPitchJa] = useState("");
  const [pitchTab, setPitchTab] = useState("ja"); // "en" | "ja"
  const [translating, setTranslating] = useState(false);
  const [epk, setEpk] = useState("");
  const [step, setStep] = useState(0);
  const [savedArtists, setSavedArtists] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [showLinks, setShowLinks] = useState(true);
  const [pitchStyle, setPitchStyle] = useState("professional");
  const [quickUrl, setQuickUrl] = useState("");
  const [validationError, setValidationError] = useState(false);
  const [pitchSent, setPitchSent] = useState(false);
  const targets = curators.filter(c => selected.includes(c.id));
  const cost = targets.reduce((sum, c) => sum + (c.creditCost || 2), 0);
  // Build effective track for match scoring (same logic as CuratorBrowser)
  const effectiveTrack = useMemo(() => {
    const trackGenre = trackData?.genre || artist?.genre || '';
    const mood       = trackData?.mood  || artist?.mood  || '';
    if (!trackGenre && !trackData?.audioFeatures) return null;
    return { ...trackData, genre: trackGenre, mood };
  }, [trackData, artist]);
  const setF = (k, v) => setArtist(prev => ({...prev, [k]: v}));
  const setL = (k, v) => setLinks(prev => ({...prev, [k]: v}));
  const setFol = (k, v) => setFollowers(prev => ({...prev, [k]: parseInt(v)||0}));

  // ── Detect platform from URL/text ──
  const detectPlatform = (text) => {
    const t = text.toLowerCase();
    if (t.includes("spotify.com") || t.includes("spotify:")) return "spotify";
    if (t.includes("music.apple.com")) return "apple";
    if (t.includes("youtube.com") || t.includes("youtu.be")) return "youtube";
    if (t.includes("soundcloud.com")) return "soundcloud";
    if (t.includes("instagram.com")) return "instagram";
    if (t.includes("twitter.com") || t.includes("x.com")) return "twitter";
    if (t.includes("facebook.com") || t.includes("fb.com") || t.includes("fb.me")) return "facebook";
    if (t.startsWith("http")) return "website";
    return null;
  };

  // ── Quick URL input — only assign on Enter or blur, never auto-clear while typing ──
  const handleQuickUrlChange = (val) => {
    setQuickUrl(val);
  };

  const commitQuickUrl = () => {
    const trimmed = quickUrl.trim();
    if (!trimmed) return;
    const platform = detectPlatform(trimmed);
    if (platform) {
      setL(platform, trimmed);
      setQuickUrl("");
      notify("✅ " + ({spotify:"Spotify",apple:"Apple Music",youtube:"YouTube",soundcloud:"SoundCloud",instagram:"Instagram",twitter:"X",facebook:"Facebook",website:"Website"}[platform] || platform) + " に追加しました");
    } else if (trimmed.startsWith("http")) {
      setL("website", trimmed);
      setQuickUrl("");
      notify("✅ Websiteに追加しました");
    } else {
      notify("⚠️ URLを認識できません。https://で始まるURLを入力してください");
    }
  };

  // ── Enter to confirm quick URL ──
  const handleQuickUrlKey = (e) => {
    if (e.key !== "Enter") return;
    commitQuickUrl();
  };

  // ── Normalize @handle to URL on blur ──
  const normalizeOnBlur = (platform) => {
    const v = (links[platform] || "").trim();
    if (!v || v.startsWith("http")) return;
    const handle = v.replace(/^@/, "");
    const urls = {
      instagram: "https://instagram.com/" + handle,
      twitter: "https://x.com/" + handle,
      youtube: "https://youtube.com/@" + handle,
      facebook: "https://facebook.com/" + handle,
      soundcloud: "https://soundcloud.com/" + handle,
    };
    if (urls[platform]) setL(platform, urls[platform]);
  };

  // ── Persistent storage ──
  const loadSaved = async () => {
    if (!window.storage) return;
    try {
      const keys = await window.storage.list("artist:");
      if (!keys?.keys?.length) return;
      const list = [];
      for (const k of keys.keys) { try { const r = await window.storage.get(k); if (r?.value) list.push(JSON.parse(r.value)); } catch {} }
      setSavedArtists(list.filter(a => a?.name));
    } catch {}
  };
  const saveToStorage = async (data, sLinks, fol) => {
    if (!window.storage || !data.name) return;
    const key = "artist:" + (data.nameEn||data.name).toLowerCase().replace(/[^a-z0-9]/g,"_").substring(0,60);
    try { await window.storage.set(key, JSON.stringify({...data, _links: sLinks, _followers: fol})); await loadSaved(); } catch {}
  };
  const deleteFromStorage = async (data) => {
    if (!window.storage || !data.name) return;
    const key = "artist:" + (data.nameEn||data.name).toLowerCase().replace(/[^a-z0-9]/g,"_").substring(0,60);
    try { await window.storage.delete(key); await loadSaved(); notify((data.nameEn||data.name) + " を削除"); } catch {}
  };
  useEffect(() => { loadSaved(); }, []);

  // ── Auto-populate from CuratorBrowser trackData ──
  useEffect(() => {
    if (!trackData) return;
    setArtist(prev => {
      const updated = {...prev};
      // songTitle: always use trackData if available (user just analyzed this track)
      if (trackData.songName) updated.songTitle = trackData.songName;
      // songLink: use the listening URL from curator analysis
      if (trackData.listeningUrl) updated.songLink = trackData.listeningUrl;
      // Artist name: always carry over from curator tab analysis
      if (trackData.artistName) {
        updated.name = updated.name || trackData.artistName;
        updated.nameEn = trackData.artistName;
      }
      // Genre/mood: fill if empty
      if (!updated.genre && trackData.genre) updated.genre = trackData.genre;
      if (!updated.mood && trackData.mood) updated.mood = trackData.mood;
      return updated;
    });
  }, []); // Run once on mount

  const applyToForm = (p) => {
    setArtist({name:p.name||"",nameEn:p.nameEn||p.name_en||"",genre:p.genre||"",mood:p.mood||"",description:p.description||"",songTitle:p.songTitle||p.song_title||"",songLink:p.songLink||p.song_link||"",influences:p.influences||"",achievements:p.achievements||"",sns:p.sns||""});
    setLinks(p._links || {spotify:"",apple:"",youtube:"",soundcloud:"",instagram:"",twitter:"",facebook:"",website:""});
    setFollowers(p._followers || {spotify:0,youtube:0,soundcloud:0,instagram:0,twitter:0,facebook:0});
  };

  const getSongLink = () => artist.songLink || links.spotify || links.youtube || links.apple || links.soundcloud || "";
  const linkCount = Object.values(links).filter(Boolean).length;
  const folCount = Object.values(followers).filter(v => v > 0).length;
  const fmtK = (n) => { if (!n) return ""; if (n >= 1000000) return (n/1000000).toFixed(1).replace(/\.0$/,"") + "M"; if (n >= 1000) return (n/1000).toFixed(1).replace(/\.0$/,"") + "K"; return String(n); };
  const [aiLoading, setAiLoading] = useState(false);
  const [fetchingFollowers, setFetchingFollowers] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [trackAnalysisStatus, setTrackAnalysisStatus] = useState('idle'); // 'idle'|'loading'|'done'|'error'
  const analyzeInFlightRef = useRef(false);
  // Separate title for the specific track being pitched (vs artist.songTitle = 代表曲)
  const [pitchSongTitle, setPitchSongTitle] = useState('');
  const [pitchSongTitleAuto, setPitchSongTitleAuto] = useState(false);
  const [customGenre, setCustomGenre] = useState("");
  const parseGenreTags = (str) => (str||'').split(',').map(s=>s.trim()).filter(Boolean);
  const toggleGenreTag = (tag) => {
    const curr = parseGenreTags(artist.genre);
    setF('genre', (curr.includes(tag) ? curr.filter(t=>t!==tag) : [...curr, tag]).join(', '));
  };
  const applyCustomGenre = () => {
    const g = customGenre.trim();
    if (!g) return;
    const curr = parseGenreTags(artist.genre);
    if (!curr.includes(g)) setF('genre', [...curr, g].join(', '));
    setCustomGenre('');
  };

  const analyzeTrackFn = async (songName, artistName, trackUrl) => {
    if (!songName?.trim() && !trackUrl?.trim()) return;
    if (analyzeInFlightRef.current) return; // Prevent concurrent requests
    analyzeInFlightRef.current = true;
    setAnalyzeLoading(true);
    setTrackAnalysisStatus('loading');
    try {
      const result = await analyzeTrack({
        ...(trackUrl ? { trackUrl: trackUrl.trim() } : {}),
        songName: (songName || '').trim(),
        artistName: (artistName || '').trim(),
      });
      console.log('[analyzeTrack] result:', { songName: result.songName, artistName: result.artistName, audioFeatures: result.audioFeatures, soundnetError: result.soundnetError });
      if (setTrackData) setTrackData({ ...result, genre: artist.genre, mood: artist.mood });
      setTrackAnalysisStatus('done');
    } catch (e) {
      console.warn('Track analyze:', e.message);
      setTrackAnalysisStatus('error');
    } finally {
      analyzeInFlightRef.current = false;
      setAnalyzeLoading(false);
    }
  };

  // Auto-analyze when songTitle + artist name are filled (1.5s debounce)
  // Skips when a streaming URL is present — the URL effect handles that case
  const lastAnalyzedKeyRef = useRef('');
  const hasStreamingUrl = /spotify\.com\/track\/|youtube\.com\/|youtu\.be\/|soundcloud\.com\//.test(artist.songLink || '');
  useEffect(() => {
    if (hasStreamingUrl) return; // URL trigger takes priority
    const song = artist.songTitle?.trim();
    const name = (artist.nameEn || artist.name)?.trim();
    if (!song || !name) return;
    const key = 'name|' + song + '|' + name;
    if (key === lastAnalyzedKeyRef.current) return;
    const timer = setTimeout(() => {
      lastAnalyzedKeyRef.current = key;
      analyzeTrackFn(song, name);
    }, 3000);
    return () => clearTimeout(timer);
  }, [artist.songTitle, artist.nameEn, artist.name, hasStreamingUrl]);

  // Trigger analysis after pitchSongTitle is confirmed (oEmbed resolved or manually entered)
  // This replaces the old URL-only trigger so we always send the correct song name to SoundNet
  useEffect(() => {
    const url = artist.songLink?.trim();
    const song = pitchSongTitle?.trim();
    if (!url || !song) return;
    if (!/spotify\.com\/track\/|youtube\.com\/|youtu\.be\/|soundcloud\.com\//.test(url)) return;
    const key = 'pitch|' + url + '|' + song;
    if (key === lastAnalyzedKeyRef.current) return;
    const artistName = (artist.nameEn || artist.name)?.trim();
    const timer = setTimeout(() => {
      lastAnalyzedKeyRef.current = key;
      analyzeTrackFn(song, artistName, url);
    }, 500); // Short — oEmbed already waited ~200ms before setting pitchSongTitle
    return () => clearTimeout(timer);
  }, [pitchSongTitle, artist.songLink]);

  // Auto-fetch pitch song title from oEmbed when URL is entered (fast, no auth needed)
  useEffect(() => {
    const url = artist.songLink?.trim();
    if (!url) {
      if (pitchSongTitleAuto) { setPitchSongTitle(''); setPitchSongTitleAuto(false); }
      return;
    }
    if (!pitchSongTitleAuto && pitchSongTitle) return; // User manually typed a title — don't overwrite
    const embed = getEmbedInfo(url);
    if (!embed) return;
    let cancelled = false;
    const oembedUrl = embed.type === 'spotify'
      ? `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
      : `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    fetch(oembedUrl)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled || !d?.title) return;
        const title = embed.type === 'youtube' ? (parseYTTitle(d.title, d.author_name) || d.title) : d.title;
        if (title) { setPitchSongTitle(title); setPitchSongTitleAuto(true); }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [artist.songLink]);

  // Initialize pitchSongTitle from trackData on mount (if analyzed in CuratorBrowser)
  useEffect(() => {
    if (trackData?.songName && !pitchSongTitle) {
      setPitchSongTitle(trackData.songName);
      setPitchSongTitleAuto(true);
    }
  }, [trackData?.songName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-fetch followers from API ──
  const autoFetchFollowers = async () => {
    if (!links.youtube && !links.spotify && !links.soundcloud) {
      notify("YouTube、Spotify、またはSoundCloudのURLを先に入力してください");
      return;
    }
    setFetchingFollowers(true);
    try {
      const result = await API.fetchFollowers(links);
      if (result.followers) {
        const f = result.followers;
        const updates = {};
        if (f.youtube) updates.youtube = f.youtube;
        if (f.spotify) updates.spotify = f.spotify;
        if (f.soundcloud) updates.soundcloud = f.soundcloud;
        if (Object.keys(updates).length > 0) {
          setFollowers(prev => ({...prev, ...updates}));
        }
        // Build detailed status message
        const succeeded = [];
        const failed = [];
        if (links.youtube) { f.youtube ? succeeded.push("YouTube: " + f.youtube) : failed.push("YouTube"); }
        if (links.spotify) { f.spotify ? succeeded.push("Spotify: " + f.spotify) : failed.push("Spotify"); }
        if (links.soundcloud) { f.soundcloud ? succeeded.push("SoundCloud: " + f.soundcloud) : failed.push("SoundCloud"); }
        let msg = "";
        if (succeeded.length > 0) msg += "✅ 取得: " + succeeded.join(", ");
        if (failed.length > 0) {
          if (msg) msg += " | ";
          msg += "⚠️ 未取得: " + failed.join(", ");
          if (result.errors && Object.keys(result.errors).length > 0) {
            const errDetails = Object.entries(result.errors).filter(([k]) => k !== "_note").map(([k,v]) => k + ": " + v).join("; ");
            if (errDetails) msg += " (" + errDetails + ")";
          }
        }
        notify(msg || "取得可能なデータがありませんでした");
      }
    } catch (err) {
      notify("⚠️ 自動取得失敗: " + err.message);
    }
    setFetchingFollowers(false);
  };

  // ── Translate helpers ──
  const translateToJa = async (enText) => {
    setTranslating(true);
    try {
      const res = await fetch('/api/pitch/translate', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text: enText }) });
      const data = await res.json();
      if (data.translated) setPitchJa(data.translated);
    } catch (e) { console.warn('Translate EN→JA:', e.message); }
    setTranslating(false);
  };

  const translateToEn = async () => {
    setTranslating(true);
    try {
      const res = await fetch('/api/pitch/translate', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text: pitchJa, reverse: true }) });
      const data = await res.json();
      if (data.translated) setPitchText(data.translated);
    } catch (e) { console.warn('Translate JA→EN:', e.message); }
    setTranslating(false);
  };

  // ── AI Pitch generation (server-side Anthropic) ──
  const generateAIPitch = async () => {
    setAiLoading(true);
    try {
      const lnk = {...links, songLink: getSongLink()};
      const rep = targets[0] || {name:"Curator",type:"blog",platform:"Music Platform"};
      // Use pitchSongTitle (track-specific) over artist.songTitle (representative track)
      const pitchArtist = pitchSongTitle ? { ...artist, songTitle: pitchSongTitle } : artist;
      const result = await API.generatePitch(pitchArtist, rep, pitchStyle, lnk, followers, user.name, trackData?.audioFeatures);
      setPitchText(result.pitch);
      setEpk(result.epk);
      setPitchTab("ja");
      setStep(2);
      notify("✅ AIピッチ生成完了！日本語訳を生成中...");
      translateToJa(result.pitch);
    } catch (err) {
      notify("AI生成失敗 → テンプレートで代替: " + err.message);
      generatePitch(); // Fallback to template
    }
    setAiLoading(false);
  };

  // ── Pitch generation ──
  const generatePitch = () => {
    const lnk = {...links, songLink: getSongLink()};
    const rep = targets[0] || {name:"Curator",type:"blog",platform:"Music Platform"};
    const pitchArtist = pitchSongTitle ? { ...artist, songTitle: pitchSongTitle } : artist;
    const generated = PE.generate(pitchArtist, rep, pitchStyle, lnk, user.name, followers);
    setPitchText(generated);
    setEpk(PE.epk(pitchArtist, lnk, followers));
    setPitchJa("");
    setPitchTab("ja");
    setStep(2);
    translateToJa(generated);
  };

  const sendAll = async () => {
    if (credits < cost) { notify("クレジットが不足しています", "error"); return; }
    const lnk = {...links, songLink: getSongLink()};
    const tempPitches = targets.map(c => ({
      id: "p_" + Date.now() + "_" + c.id,
      artistId: user.id, artistEmail: user.email, artistName: artist.name, artistNameEn: artist.nameEn||artist.name,
      songTitle: artist.songTitle, songLink: getSongLink(), genre: artist.genre, mood: artist.mood, description: artist.description, influences: artist.influences, achievements: artist.achievements,
      pitchText: pitchText.replace(/\[Curator Name\]/gi, c.name), epk,
      matchScore: effectiveTrack ? calculateMatchScore(c, effectiveTrack) : null,
      curatorId: c.id, curatorName: c.name, curatorPlatform: c.platform, curatorEmail: c.email, creditCost: c.creditCost||2,
      status: "sent", sentAt: new Date().toISOString(),
      openedAt:null, listenedAt:null, feedbackAt:null, listenDuration:0,
      feedback:null, rating:null, decision:null,
      deadline: new Date(Date.now()+7*24*60*60*1000).toISOString(),
    }));

    // Insert each pitch to DB individually to get the actual Supabase UUID.
    // insertPitchGetUUID also auto-translates Japanese content to English.
    // Replace the temporary local id with the real UUID so email links work.
    const newPitches = [];
    for (const p of tempPitches) {
      const result = await insertPitchGetUUID(p);
      if (result) {
        // Use translated pitchText (if translation occurred) for the email body
        newPitches.push({ ...p, id: result.id, pitchText: result.pitchText ?? p.pitchText });
      } else {
        newPitches.push(p);
      }
    }

    await savePitches([...newPitches, ...pitches]);
    await saveCredits(credits - cost);
    saveToStorage(artist, links, followers);
    setStep(3);
    setPitchSent(true);
    // Send real emails with the actual DB UUID so /curator/pitch/[id] links work
    for (const p of newPitches) {
      try {
        if (p.curatorEmail) {
          await API.sendPitchEmail(p.id, p.curatorEmail, p.curatorName, p.pitchText, p.epk, p.artistNameEn || p.artistName, p.songLink);
        }
      } catch (e) { console.log("Email send skipped:", e.message); }
    }
    notify("✅ " + newPitches.length + "件送信完了！");
  };

  const resetForm = () => { setSelected([]); setStep(0); setPitchText(""); setPitchJa(""); setEpk(""); setPitchSent(false); };
  const useSample = (s) => { setArtist({name:s.name,nameEn:s.nameEn,genre:s.genre,mood:s.mood,description:s.description,songTitle:s.songTitle,songLink:s.songLink,influences:s.influences,achievements:s.achievements,sns:""}); setLinks({spotify:s.songLink||"",apple:"",youtube:"",soundcloud:"",instagram:"",twitter:"",facebook:"",website:""}); setFollowers({spotify:0,youtube:0,soundcloud:0,instagram:0,twitter:0,facebook:0}); };

  if (targets.length === 0 && step === 0) {
    return <div style={{textAlign:"center",padding:"3rem 1rem"}}><div style={{fontSize:"2.5rem",marginBottom:"1rem"}}>◎</div><h2 style={{fontWeight:700}}>キュレーターを選択してください</h2><p style={{color:"#9a958e",marginBottom:"1.5rem"}}>まずキュレーター検索で送信先を選んでください</p><button style={css.btnPrimary} onClick={()=>setPage("curators")}>キュレーターを探す</button></div>;
  }

  return <div>
    <div style={{marginBottom:"1.5rem"}}><h1 style={{fontSize:28,fontWeight:800,margin:0,fontFamily:"'Playfair Display',Georgia,serif",color:"#1a1a1a"}}>AIピッチを作成</h1><p style={{color:"#6b6560",fontSize:15,margin:"8px 0 0",fontFamily:"'DM Sans',sans-serif"}}>AIがあなたの楽曲に合わせた英語の紹介文を自動作成します</p></div>
    <div style={{marginBottom:"1.5rem"}}>
      <div style={{display:"flex",gap:4}}>
        {["情報入力","キュレーター","確認&編集","送信"].map((l,i) => <div key={i} style={{flex:1,height:4,borderRadius:4,background:i<=step?"linear-gradient(90deg,#c4956a,#e85d3a)":"rgba(0,0,0,0.06)"}}/>)}
      </div>
      <div className="pitch-step-labels" style={{display:"flex",gap:4,marginTop:6}}>
        {["情報入力","キュレーター","確認&編集","送信"].map((l,i) => <div key={i} style={{flex:1,textAlign:"center",fontSize:11,fontFamily:"'DM Sans',sans-serif",color:i===step?"#1a1a1a":"#6b6560",fontWeight:i===step?500:400}}>{l}</div>)}
      </div>
    </div>
    <div style={{background:"#ffffff",border:"1px solid #e5e2dc",borderRadius:14,padding:"20px 24px",marginBottom:20}}>
      <div style={{color:"#6b6560",fontSize:13,marginBottom:12,fontFamily:"'DM Sans',sans-serif"}}>📨 送信先 ({targets.length}人)</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
        {targets.map(c => (
          <div key={c.id} style={{background:"#ffffff",border:"1px solid #e5e2dc",borderRadius:10,padding:"10px 16px",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(196,149,106,0.25)",color:"#c4956a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,flexShrink:0}}>{c.name?.charAt(0)}</div>
            <div>
              <div style={{color:"#1a1a1a",fontSize:14,fontWeight:500,fontFamily:"'DM Sans',sans-serif"}}>{c.name}</div>
              <div style={{color:"#6b6560",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>{c.type}{c.platform ? ` · ${c.platform}` : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* ═══ STEP 0 ═══ */}
    {step === 0 && <div style={{background:"#ffffff",borderRadius:16,border:"1px solid rgba(0,0,0,0.05)",padding:"1.5rem"}}>

      {/* Saved */}
      {savedArtists.length > 0 && (
        <div style={{background:"rgba(196,149,106,0.06)",borderRadius:12,padding:"0.7rem 0.8rem",marginBottom:"1rem",border:"1px solid rgba(196,149,106,0.25)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:"0.82rem",fontWeight:700,color:"#c4956a"}}>💾 保存済み ({savedArtists.length})</span>
            <button style={{fontSize:"0.7rem",color:"#c4956a",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}} onClick={()=>setShowSaved(!showSaved)}>{showSaved?"▲":"▼"}</button>
          </div>
          {showSaved ? <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:6}}>
            {savedArtists.map((a,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"0.35rem 0.5rem",background:"#f0ede6",borderRadius:8,border:"1px solid rgba(196,149,106,0.25)"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:"0.78rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#1a1a1a"}}>{a.nameEn||a.name}</div>
                  <div style={{fontSize:"0.66rem",color:"#6b6560"}}>{a.genre}</div>
                </div>
                <button style={{padding:"0.2rem 0.5rem",background:"rgba(196,149,106,0.1)",border:"1px solid rgba(196,149,106,0.3)",borderRadius:6,fontSize:"0.68rem",color:"#c4956a",cursor:"pointer",fontWeight:600,fontFamily:"inherit"}} onClick={()=>{applyToForm(a);setShowSaved(false);notify((a.nameEn||a.name)+" 読込");}}>読込</button>
                <button style={{padding:"0.2rem 0.3rem",background:"none",border:"1px solid #fecaca",borderRadius:5,fontSize:"0.64rem",color:"#dc2626",cursor:"pointer",fontFamily:"inherit"}} onClick={()=>deleteFromStorage(a)}>✕</button>
              </div>
            ))}
          </div> : <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:5}}>
            {savedArtists.slice(0,6).map((a,i) => <button key={i} style={{padding:"0.2rem 0.5rem",background:"#f0ede6",border:"1px solid rgba(196,149,106,0.25)",borderRadius:6,fontSize:"0.7rem",color:"#c4956a",cursor:"pointer",fontFamily:"inherit"}} onClick={()=>{applyToForm(a);notify((a.nameEn||a.name)+" 読込");}}>{a.nameEn||a.name}</button>)}
          </div>}
        </div>
      )}

      {/* Samples + Clear */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.3rem"}}>
        {artist.name || artist.songLink ? (
          <span style={{fontSize:"0.62rem",color:"#10b981",fontWeight:600}}>✅ 入力内容を保持中（画面移動しても消えません）</span>
        ) : <span/>}
        <div style={{display:"flex",gap:6}}>
          <button style={css.btnSm} onClick={()=>setShowSamples(!showSamples)}>📋 サンプル</button>
          {(artist.name || artist.songLink || links.spotify || links.youtube) && (
            <button style={{...css.btnSm,color:"#ef4444",border:"1px solid #fecaca"}} onClick={()=>{if(window.confirm("入力内容をクリアしますか？"))clearArtistDraft();}}>クリア</button>
          )}
        </div>
      </div>
      {showSamples && <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:"0.8rem"}}>
        {DEMO_ARTISTS.map(a => <button key={a.id} style={{display:"flex",alignItems:"center",gap:6,padding:"0.4rem",background:"#f0ede6",border:"1px solid rgba(0,0,0,0.06)",borderRadius:8,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}} onClick={()=>{useSample(a);setShowSamples(false);}}><span style={{fontSize:"1rem"}}>{a.image}</span><div><div style={{fontWeight:600,fontSize:"0.75rem",color:"#1a1a1a"}}>{a.name}</div><div style={{fontSize:"0.62rem",color:"#9a958e"}}>{a.genre}</div></div></button>)}
      </div>}

      {/* ── Basic Info ── */}
      <div style={{fontSize:"0.82rem",fontWeight:700,color:"#1a1a1a",marginBottom:"0.3rem"}}>🎤 基本情報</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        <div><label style={{fontSize:"0.66rem",color:"#6b6560",fontWeight:600}}>アーティスト名 <span style={{color:"#e85d3a"}}>*</span></label><input style={{...css.input,...(validationError && !artist.name ? {border:"1px solid #e85d3a"} : {})}} value={artist.name} onChange={e=>setF("name",e.target.value)} placeholder="ROUTE14band"/></div>
        <div><label style={{fontSize:"0.66rem",color:"#6b6560",fontWeight:600}}>English Name <span style={{color:"#e85d3a"}}>*</span></label><input style={{...css.input,...(validationError && !artist.nameEn ? {border:"1px solid #e85d3a"} : {})}} value={artist.nameEn} onChange={e=>setF("nameEn",e.target.value)} placeholder="ROUTE14band"/></div>
        <div><label style={{fontSize:"0.66rem",color:"#6b6560",fontWeight:600}}>ムード</label><input style={css.input} value={artist.mood} onChange={e=>setF("mood",e.target.value)} placeholder="Energetic, Groovy"/></div>
        <div><label style={{fontSize:"0.66rem",color:"#6b6560",fontWeight:600}}>代表曲</label><input style={css.input} value={artist.songTitle} onChange={e=>setF("songTitle",e.target.value)} placeholder="Crossroad"/></div>
        <div style={{gridColumn:"1/-1"}}><label style={{fontSize:"0.66rem",color:"#6b6560",fontWeight:600}}>類似アーティスト</label><input style={css.input} value={artist.influences} onChange={e=>setF("influences",e.target.value)} placeholder="Snarky Puppy, WONK"/></div>
      </div>
      {/* ── Genre Tag Selector ── */}
      <div style={{marginTop:4}}>
        <label style={{fontSize:"0.66rem",color:"#6b6560",fontWeight:600}}>ジャンル <span style={{color:"#e85d3a"}}>*</span>（複数選択可）</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4,margin:"5px 0 6px"}}>
          {ARTIST_GENRES.map(g => {
            const sel = parseGenreTags(artist.genre).includes(g);
            return <button key={g} type="button" onClick={()=>toggleGenreTag(g)} style={{padding:"0.18rem 0.5rem",borderRadius:6,fontSize:"0.7rem",cursor:"pointer",fontFamily:"inherit",background:sel?"rgba(196,149,106,0.15)":"#ffffff",color:sel?"#c4956a":"#6b6560",border:sel?"1px solid #c4956a":"1px solid rgba(0,0,0,0.06)",fontWeight:sel?600:400}}>{g}</button>;
          })}
        </div>
        {artist.genre && <div style={{fontSize:"0.62rem",color:"#c4956a",marginBottom:4}}>選択中: {artist.genre}</div>}
        <input style={{...css.input,fontSize:"0.78rem",marginBottom:0}} value={customGenre} onChange={e=>setCustomGenre(e.target.value)} onBlur={applyCustomGenre} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();applyCustomGenre();}}} placeholder="カスタムジャンルを追加（Enterで確定）"/>
      </div>

      {/* ── Pitch Track URL ── */}
      <div style={{marginTop:8,background:"rgba(196,149,106,0.06)",borderRadius:10,padding:"0.7rem",border:"1px solid rgba(196,149,106,0.3)"}}>
        <label style={{fontSize:"0.72rem",color:"#c4956a",fontWeight:700}}>🎵 ピッチ楽曲URL <span style={{color:"#e85d3a"}}>*</span>（キュレーターに聴いてもらう曲）</label>
        <div style={{fontSize:"0.6rem",color:"#c4956a",marginBottom:4}}>Spotify, YouTube, SoundCloud等のURLを入力 — ピッチメールに自動挿入されます</div>
        <input style={{...css.input,border:"1px solid rgba(196,149,106,0.3)",background:"rgba(196,149,106,0.06)"}} value={artist.songLink||""} onChange={e=>setF("songLink",e.target.value)} placeholder="https://open.spotify.com/track/... or https://youtube.com/watch?v=..."/>
        {/* Pitch song title — auto-populated from oEmbed, editable */}
        <div style={{marginTop:6}}>
          <label style={{fontSize:"0.62rem",color:"#c4956a",fontWeight:600,display:"flex",alignItems:"center",gap:5}}>
            🎵 ピッチ対象曲名
            {pitchSongTitleAuto && <span style={{fontWeight:400,color:"#9a958e",fontSize:"0.58rem"}}>URLから自動取得</span>}
          </label>
          <input
            style={{...css.input,border:"1px solid rgba(196,149,106,0.3)",background:"rgba(196,149,106,0.06)",marginTop:2}}
            value={pitchSongTitle}
            onChange={e=>{setPitchSongTitle(e.target.value);setPitchSongTitleAuto(false);}}
            placeholder={artist.songTitle ? `${artist.songTitle}（代表曲）` : "ピッチする曲名を入力"}
          />
        </div>
        {/* Audio features analysis status */}
        {trackAnalysisStatus === 'loading' && (
          <div style={{marginTop:6,display:"flex",alignItems:"center",gap:6,fontSize:"0.68rem",color:"#6b6560"}}>
            <span style={{display:"inline-block",width:12,height:12,border:"2px solid rgba(0,0,0,0.06)",borderTopColor:"#c4956a",borderRadius:"50%",animation:"spin 0.8s linear infinite",flexShrink:0}}/>
            🔍 楽曲を分析中...
          </div>
        )}
        {trackAnalysisStatus === 'done' && trackData?.audioFeatures && (() => {
          const desc = describeTrackCharacteristics(trackData.audioFeatures);
          const pillTags = [];
          const af = trackData.audioFeatures;
          if (af.energy != null) pillTags.push({ icon: '⚡', label: af.energy >= 0.67 ? 'High Energy' : af.energy >= 0.33 ? 'Mid Energy' : 'Low Energy' });
          if (af.danceability >= 0.5) pillTags.push({ icon: '💃', label: 'Danceable' });
          if (af.acousticness >= 0.5) pillTags.push({ icon: '🎹', label: 'Acoustic' });
          if (af.instrumentalness >= 0.5) pillTags.push({ icon: '🎸', label: 'Instrumental' });
          if (af.valence != null) pillTags.push({ icon: af.valence >= 0.6 ? '☀️' : af.valence >= 0.3 ? '🌤' : '🌧', label: af.valence >= 0.6 ? 'Positive' : af.valence >= 0.3 ? 'Balanced' : 'Dark' });
          if (af.tempo != null) pillTags.push({ icon: '⏱', label: Math.round(af.tempo) + ' BPM' });
          return (
            <div style={{marginTop:6,padding:"0.5rem 0.6rem",background:"rgba(196,149,106,0.06)",borderRadius:8,border:"1px solid rgba(196,149,106,0.25)"}}>
              <div style={{fontSize:"0.62rem",fontWeight:700,color:"#c4956a",marginBottom:5}}>
                ✅ 楽曲分析完了
                {(pitchSongTitle || trackData.songName) && <span style={{fontWeight:400,color:"#6b6560",marginLeft:6}}>{pitchSongTitle || trackData.songName}{trackData.artistName ? ` — ${trackData.artistName}` : ''}</span>}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {pillTags.map(({icon,label}) => (
                  <span key={label} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"0.18rem 0.55rem",background:"#ffffff",border:"1px solid rgba(196,149,106,0.25)",borderRadius:20,fontSize:"0.65rem",color:"#c4956a",fontWeight:500}}>
                    {icon} {label}
                  </span>
                ))}
              </div>
              {desc.characteristics && (
                <div style={{marginTop:4,fontSize:"0.6rem",color:"#9a958e",fontStyle:"italic"}}>ピッチ生成に使用: {desc.characteristics}</div>
              )}
            </div>
          );
        })()}
        {(trackAnalysisStatus === 'done' && !trackData?.audioFeatures) && (
          <div style={{marginTop:6,fontSize:"0.62rem",color:"#c4956a",background:"rgba(196,149,106,0.06)",borderRadius:6,padding:"0.35rem 0.5rem",border:"1px solid rgba(196,149,106,0.3)"}}>
            ℹ️ 楽曲分析データなし — ジャンル情報でピッチを生成します
            {trackData?.soundnetError && <span style={{display:"block",color:"#9a958e",marginTop:2}}>({trackData.soundnetError})</span>}
          </div>
        )}
        {trackAnalysisStatus === 'error' && (
          <div style={{marginTop:6,fontSize:"0.62rem",color:"#c4956a",background:"rgba(196,149,106,0.06)",borderRadius:6,padding:"0.35rem 0.5rem",border:"1px solid rgba(196,149,106,0.3)"}}>
            ℹ️ 楽曲分析データなし — ジャンル情報でピッチを生成します
            <span style={{display:"block",color:"#9a958e",marginTop:2}}>(サーバーログでエラー詳細を確認してください)</span>
          </div>
        )}
        {/* Embed preview so artist can confirm correct track */}
        {(() => {
          const embed = getEmbedInfo(artist.songLink);
          if (embed?.type === 'spotify') return (
            <div style={{marginTop:8}}>
              <div style={{fontSize:"0.62rem",color:"#c4956a",fontWeight:600,marginBottom:4}}>✅ Spotify プレビュー — キュレーターにはこの曲を聴いてもらいます</div>
              <iframe src={`https://open.spotify.com/embed/track/${embed.id}?theme=0`} width="100%" height="80" frameBorder="0" allow="encrypted-media" style={{borderRadius:12,display:"block"}} title="Spotify preview"/>
            </div>
          );
          if (embed?.type === 'youtube') return (
            <div style={{marginTop:8}}>
              <div style={{fontSize:"0.62rem",color:"#c4956a",fontWeight:600,marginBottom:4}}>✅ YouTube プレビュー — キュレーターにはこの曲を聴いてもらいます</div>
              <div style={{position:"relative",paddingBottom:"56.25%",height:0,overflow:"hidden",borderRadius:12}}>
                <iframe src={`https://www.youtube.com/embed/${embed.id}`} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none",borderRadius:12}} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="YouTube preview"/>
              </div>
            </div>
          );
          return null;
        })()}
      </div>
      <div style={{marginTop:5}}><label style={{fontSize:"0.66rem",color:"#6b6560",fontWeight:600}}>主な実績・数値</label><input style={css.input} value={artist.achievements} onChange={e=>setF("achievements",e.target.value)} placeholder="SXSW 10年連続出演, Spotify月間50万再生"/></div>
      <div style={{marginTop:4}}><label style={{fontSize:"0.66rem",color:"#6b6560",fontWeight:600}}>紹介文 <span style={{color:"#e85d3a"}}>*</span>（日本語OK）</label><textarea style={{...css.input,minHeight:60,resize:"vertical"}} value={artist.description} onChange={e=>setF("description",e.target.value)} placeholder="音楽性、特徴、ユニークなポイント"/></div>

      {/* ── SNS & Links + Followers ── */}
      <div style={{marginTop:"0.8rem",background:"rgba(196,149,106,0.06)",borderRadius:12,padding:"0.8rem",border:"1px solid rgba(196,149,106,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:"0.82rem",fontWeight:700,color:"#c4956a"}}>🔗 SNS＆ストリーミング</span>
            {linkCount > 0 && <span style={{fontSize:"0.66rem",background:"rgba(196,149,106,0.1)",color:"#c4956a",padding:"1px 6px",borderRadius:10,fontWeight:600}}>{linkCount}件</span>}
            {folCount > 0 && <span style={{fontSize:"0.66rem",background:"rgba(196,149,106,0.08)",color:"#c4956a",padding:"1px 6px",borderRadius:10,fontWeight:600}}>👥{folCount}</span>}
          </div>
          <button style={{fontSize:"0.68rem",color:"#c4956a",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}} onClick={()=>setShowLinks(!showLinks)}>{showLinks?"▲":"▼ 開く"}</button>
        </div>

        {showLinks && <>
          <div style={{fontSize:"0.62rem",color:"#c4956a",marginBottom:6}}>URL or @アカウント名で入力。フォロワー数を入れるとピッチに自動で「ソーシャルプルーフ」として反映されます。</div>

          {/* Quick URL input — NO onPaste, pure onChange */}
          <div style={{marginBottom:8,position:"relative"}}>
            <label style={{fontSize:"0.64rem",color:"#c4956a",fontWeight:600}}>📋 URLを入力/ペースト → 自動振り分け（Enterで確定）</label>
            <input
              style={{...css.input,border:"1px solid rgba(196,149,106,0.3)",background:"rgba(196,149,106,0.06)"}}
              placeholder="https://instagram.com/xxx や https://open.spotify.com/... を入力"
              value={quickUrl}
              onChange={e => handleQuickUrlChange(e.target.value)}
              onKeyDown={handleQuickUrlKey}
              onBlur={commitQuickUrl}
            />
            {quickUrl && <div style={{fontSize:"0.6rem",color:"#c4956a",marginTop:2}}>⏎ Enterで確定{detectPlatform(quickUrl) ? " → " + detectPlatform(quickUrl) + "に追加" : ""}</div>}
          </div>

          {/* Individual platform rows: Link + Followers side by side */}
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {[
              {key:"spotify",icon:"🎧",label:"Spotify（アーティスト）",ph:"https://open.spotify.com/artist/...",fLabel:"フォロワー"},
              {key:"apple",icon:"🍎",label:"Apple Music",ph:"https://music.apple.com/...",fLabel:""},
              {key:"youtube",icon:"▶️",label:"YouTube",ph:"@channel名 or URL",fLabel:"登録者数"},
              {key:"soundcloud",icon:"☁️",label:"SoundCloud",ph:"@user or URL",fLabel:"フォロワー"},
              {key:"instagram",icon:"📷",label:"Instagram",ph:"@username or URL",fLabel:"フォロワー"},
              {key:"twitter",icon:"𝕏",label:"X (Twitter)",ph:"@username or URL",fLabel:"フォロワー"},
              {key:"facebook",icon:"📘",label:"Facebook",ph:"ページ名 or URL",fLabel:"フォロワー"},
              {key:"website",icon:"🌐",label:"Website",ph:"https://...",fLabel:""},
            ].map(s => (
              <div key={s.key} style={{display:"flex",gap:4,alignItems:"flex-end"}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:"0.6rem",color:"#6b6560"}}>{s.icon} {s.label}</label>
                  <input style={{...css.input,fontSize:"0.72rem"}} value={links[s.key]||""} onChange={e=>setL(s.key,e.target.value)} onBlur={()=>normalizeOnBlur(s.key)} placeholder={s.ph}/>
                </div>
                {s.fLabel && <div style={{width:85}}>
                  <label style={{fontSize:"0.58rem",color:"#9a958e"}}>{s.fLabel}</label>
                  <input type="number" style={{...css.input,fontSize:"0.72rem",textAlign:"right"}} value={followers[s.key]||""} onChange={e=>setFol(s.key,e.target.value)} placeholder="0"/>
                </div>}
              </div>
            ))}
          </div>

          {/* Follower summary → pitch preview */}
          {(links.youtube || links.spotify || links.soundcloud) && <div style={{marginTop:8}}>
            <button onClick={autoFetchFollowers} disabled={fetchingFollowers} style={{width:"100%",padding:"0.4rem",background:fetchingFollowers?"#1a1a1a":"#c4956a",color:fetchingFollowers?"#9a958e":"#fff",border:"none",borderRadius:8,fontSize:"0.72rem",fontWeight:600,cursor:fetchingFollowers?"wait":"pointer",fontFamily:"inherit"}}>
              {fetchingFollowers ? "⏳ フォロワー数を取得中..." : "🔄 フォロワー数を自動取得（YouTube / Spotify / SoundCloud）"}
            </button>
          </div>}
          {folCount > 0 && <div style={{marginTop:8,padding:"0.4rem 0.6rem",background:"rgba(196,149,106,0.1)",borderRadius:8,fontSize:"0.68rem",color:"#c4956a"}}>
            <strong>👥 ピッチに反映:</strong> {[
              followers.spotify ? fmtK(followers.spotify) + " Spotify followers" : "",
              followers.youtube ? fmtK(followers.youtube) + " YouTube subscribers" : "",
              followers.instagram ? fmtK(followers.instagram) + " IG followers" : "",
              followers.twitter ? fmtK(followers.twitter) + " X followers" : "",
              followers.facebook ? fmtK(followers.facebook) + " FB followers" : "",
              followers.soundcloud ? fmtK(followers.soundcloud) + " SC followers" : "",
            ].filter(Boolean).join(", ")}
          </div>}
        </>}
      </div>

      {/* Actions */}
      {validationError && <div style={{color:"#e85d3a",fontSize:12,textAlign:"center",marginTop:8,fontFamily:"'DM Sans',sans-serif",animation:"fadeIn 0.3s ease"}}>※ 必須項目を入力してください</div>}
      <div style={{display:"flex",gap:8,marginTop:"0.8rem",alignItems:"center"}}>
        <button style={{...css.btnPrimary,flex:1}} onClick={()=>{if(!artist.name||!artist.genre||!artist.description){setValidationError(true);setTimeout(()=>setValidationError(false),3000);return;}saveToStorage(artist,links,followers);setStep(1);}}>次へ →</button>
        {artist.name && <button style={{...css.btnGhost,fontSize:"0.7rem"}} onClick={()=>{saveToStorage(artist,links,followers);notify("💾 保存完了");}}>💾</button>}
      </div>
      {artist.name && !artist.achievements && <div style={{marginTop:5,padding:"0.35rem 0.6rem",background:"#fffbeb",borderRadius:6,fontSize:"0.66rem",color:"#92400e",border:"1px solid #fde68a"}}>💡 「主な実績」に数値を入れると説得力UP</div>}
    </div>}

    {/* ═══ STEP 1 ═══ */}
    {step === 1 && <div>
      <h2 style={{fontSize:18,fontWeight:500,marginBottom:"0.8rem",color:"#1a1a1a",fontFamily:"'DM Sans',sans-serif"}}>ピッチの設定</h2>
      <div style={{background:"#f0ede6",borderRadius:10,padding:"0.7rem",marginBottom:"0.8rem"}}>
        <div style={{fontWeight:700,color:"#1a1a1a"}}>🎵 {artist.nameEn||artist.name}</div>
        <div style={{fontSize:"0.78rem",color:"#6b6560"}}>{artist.genre}{artist.songTitle?" · \""+artist.songTitle+"\"":""}</div>
        {artist.achievements && <div style={{fontSize:"0.7rem",color:"#059669",marginTop:2}}>📊 {artist.achievements}</div>}
        {(linkCount > 0 || folCount > 0) && <div style={{fontSize:"0.68rem",color:"#c4956a",marginTop:2}}>🔗{linkCount}件 {folCount > 0 ? "· 👥フォロワー"+folCount+"件" : ""}</div>}
      </div>
      <div style={{fontSize:14,fontWeight:700,marginBottom:5}}>📨 送信先 ({targets.length}人)</div>
      {targets.map(c => <div key={c.id} style={{display:"flex",alignItems:"center",gap:6,padding:"0.4rem 0",borderBottom:"1px solid rgba(0,0,0,0.05)"}}><span>{c.avatar}</span><span style={{fontWeight:500,fontSize:14,color:"#1a1a1a"}}>{c.name}</span><span style={{fontSize:13,color:"#6b6560"}}>{c.platform}</span><span style={{fontSize:13,color:"#9a958e",marginLeft:"auto",fontStyle:"italic"}}>{c.type}</span></div>)}
      <div style={{background:"linear-gradient(135deg, rgba(196,149,106,0.12), rgba(196,149,106,0.06))",borderRadius:12,padding:"12px 16px",marginTop:"0.6rem",fontSize:14,color:"#c4956a",border:"1px solid rgba(196,149,106,0.3)",fontWeight:500}}>💰 {cost}cr (残: {credits}→{credits-cost})</div>
      <div style={{margin:"0.8rem 0",padding:"0.7rem",background:"rgba(196,149,106,0.06)",borderRadius:10,border:"1px solid rgba(196,149,106,0.3)"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#c4956a",marginBottom:6}}>🏷 ピッチスタイル</div>
        <div style={{display:"flex",gap:6}}>
          {[{id:"professional",l:"📋 プロ",d:"業界標準"},{id:"casual",l:"💬 カジュアル",d:"親しみ"},{id:"storytelling",l:"📖 ストーリー",d:"描写重視"}].map(s => <button key={s.id} onClick={()=>setPitchStyle(s.id)} style={{flex:1,padding:"0.5rem",borderRadius:10,border:pitchStyle===s.id?"2px solid #c4956a":"1px solid #e5e2dc",background:pitchStyle===s.id?"rgba(196,149,106,0.1)":"#ffffff",cursor:"pointer",fontFamily:"inherit",textAlign:"center",boxShadow:pitchStyle===s.id?"0 0 12px rgba(196,149,106,0.1)":"none"}}><div style={{fontSize:14,fontWeight:600,color:pitchStyle===s.id?"#c4956a":"#1a1a1a"}}>{s.l}</div><div style={{fontSize:12,color:"#6b6560"}}>{s.d}</div></button>)}
        </div>
      </div>
      <div style={{fontSize:12,color:"#6b6560",textAlign:"center",marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>AIが英語のプロフェッショナルな紹介文を生成します（約30秒）</div>
      <div style={{display:"flex",gap:8}}><button style={css.btnGhost} onClick={()=>setStep(0)}>← 戻る</button><button style={{...css.btnPrimary,flex:1}} disabled={aiLoading} onClick={generateAIPitch}>{aiLoading ? "🤖 AI生成中..." : "🤖 AIピッチ生成"}</button><button style={css.btnGhost} onClick={generatePitch}>📝 テンプレ</button></div>
    </div>}

    {/* ═══ STEP 2 ═══ */}
    {step === 2 && <div>
      <h2 style={{fontSize:18,fontWeight:500,marginBottom:"0.4rem",color:"#1a1a1a",fontFamily:"'DM Sans',sans-serif"}}>ピッチレビュー</h2>
      <div style={{fontSize:13,color:"#6b6560",marginBottom:"0.7rem",fontFamily:"'DM Sans',sans-serif"}}>✏️ 編集可。送信時は英語版が使われます。</div>

      {/* Tab bar */}
      <div style={{display:"flex",gap:0,marginBottom:0,borderRadius:"10px 10px 0 0",overflow:"hidden",border:"1px solid rgba(0,0,0,0.06)",borderBottom:"none"}}>
        {[{id:"ja",label:"🇯🇵 日本語",sub:"確認用"},{id:"en",label:"🇬🇧 English",sub:"送信版"}].map(t => (
          <button key={t.id} onClick={()=>setPitchTab(t.id)} style={{flex:1,padding:"0.6rem 0.4rem",background:pitchTab===t.id?"#ffffff":"#ffffff",border:"none",borderRight:t.id==="ja"?"1px solid rgba(0,0,0,0.06)":"none",cursor:"pointer",fontFamily:"inherit",textAlign:"center",borderBottom:pitchTab===t.id?"2px solid #c4956a":"none"}}>
            <div style={{fontSize:15,fontWeight:700,color:pitchTab===t.id?"#c4956a":"#6b6560"}}>{t.label}</div>
            <div style={{fontSize:14,color:pitchTab===t.id?"#c4956a":"#9a958e"}}>{t.sub}</div>
          </button>
        ))}
      </div>

      {/* English tab */}
      {pitchTab === "en" && <div style={{background:"#ffffff",border:"1px solid rgba(0,0,0,0.06)",borderTop:"none",borderRadius:"0 0 12px 12px",padding:"0.8rem",marginBottom:"0.8rem"}}>
        <div style={{fontSize:14,color:"#c4956a",fontWeight:600,marginBottom:6}}>📨 この英語版が送信されます</div>
        <textarea value={pitchText} onChange={e=>setPitchText(e.target.value)} style={{width:"100%",minHeight:220,border:"none",fontFamily:"inherit",fontSize:15,lineHeight:1.8,color:"#1a1a1a",outline:"none",resize:"vertical",boxSizing:"border-box",background:"transparent"}}/>
        <button onClick={()=>{ translateToJa(pitchText); setPitchTab("ja"); }} disabled={translating} style={{marginTop:6,padding:"0.3rem 0.8rem",background:"rgba(196,149,106,0.08)",border:"1px solid rgba(196,149,106,0.3)",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontSize:"0.72rem",color:"#c4956a",fontWeight:600}}>{translating ? "反映中..." : "🔄 日本語に反映"}</button>
        <div style={{fontSize:"0.58rem",color:"#9a958e",marginTop:3}}>Claude AIで翻訳されます</div>
      </div>}

      {/* Japanese tab */}
      {pitchTab === "ja" && <div style={{background:"#ffffff",border:"1px solid rgba(0,0,0,0.06)",borderTop:"none",borderRadius:"0 0 12px 12px",padding:"0.8rem",marginBottom:"0.8rem"}}>
        <div style={{fontSize:"0.68rem",color:"#9a958e",fontWeight:600,marginBottom:6}}>👀 確認用の日本語訳です（送信されません）</div>
        {translating && !pitchJa ? (
          <div style={{minHeight:120,display:"flex",alignItems:"center",justifyContent:"center",color:"#9a958e",fontSize:"0.8rem"}}>🤖 日本語訳を生成中...</div>
        ) : (
          <textarea value={pitchJa} onChange={e=>setPitchJa(e.target.value)} style={{width:"100%",minHeight:220,border:"none",fontFamily:"inherit",fontSize:15,lineHeight:1.8,color:"#1a1a1a",outline:"none",resize:"vertical",boxSizing:"border-box",background:"transparent"}}/>
        )}
        <button onClick={()=>{ translateToEn(); setPitchTab("en"); }} disabled={translating || !pitchJa} style={{marginTop:6,padding:"0.3rem 0.8rem",background:"rgba(196,149,106,0.08)",border:"1px solid rgba(196,149,106,0.3)",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontSize:"0.72rem",color:"#c4956a",fontWeight:600}}>{translating ? "反映中..." : "🔄 英語に反映"}</button>
        <div style={{fontSize:"0.58rem",color:"#9a958e",marginTop:3}}>Claude AIで翻訳されます</div>
      </div>}

      {epk && <details style={{marginBottom:"0.8rem"}}><summary style={{cursor:"pointer",fontSize:"0.78rem",fontWeight:600,color:"#c4956a"}}>📄 EPK（英語・確認用）</summary><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:"0.74rem",background:"#ffffff",padding:"0.7rem",borderRadius:8,marginTop:6,color:"#6b6560"}}>{epk}</pre></details>}
      <div style={{display:"flex",gap:8}}><button style={css.btnGhost} onClick={()=>setStep(1)}>← 戻る</button><button style={{...css.btnPrimary,flex:1}} onClick={()=>setStep(3)}>送信へ →</button><button style={css.btnGhost} onClick={generatePitch}>🔄</button></div>
    </div>}

    {/* ═══ STEP 3 ═══ */}
    {step === 3 && <div>
      {pitchSent ? (
        <div>
          <div style={{background:"rgba(196,149,106,0.08)",border:"1px solid rgba(196,149,106,0.3)",borderRadius:16,padding:"2rem 1.5rem",textAlign:"center",marginBottom:"1.5rem"}}>
            <div style={{fontSize:"2.5rem",marginBottom:12}}>✅</div>
            <h2 style={{fontSize:18,fontWeight:700,margin:"0 0 8px",color:"#c4956a",fontFamily:"'DM Sans',sans-serif"}}>{targets.length}人のキュレーターにピッチを送信しました</h2>
            <p style={{fontSize:14,color:"#6b6560",margin:"0 0 4px",fontFamily:"'DM Sans',sans-serif"}}>フィードバックは通常3〜7日以内に届きます</p>
            <p style={{fontSize:13,color:"#c4956a",marginTop:8}}>7日以内にFB保証 · 未回答はクレジット返還</p>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            <button style={{...css.btnPrimary,background:"#c4956a",padding:"0.8rem 2rem",fontSize:"0.95rem"}} onClick={()=>{resetForm();setPage("tracking");}}>トラッキングを見る →</button>
            <button style={{...css.btnGhost}} onClick={()=>{resetForm();setPage("curators");}}>もう1曲送る</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{background:"rgba(196,149,106,0.08)",border:"1px solid rgba(196,149,106,0.3)",borderRadius:16,padding:"1.5rem",textAlign:"center",marginBottom:"1rem"}}>
            <div style={{fontSize:"2rem",marginBottom:8}}>📨</div>
            <h2 style={{fontSize:"1.15rem",fontWeight:800,margin:"0 0 0.3rem",color:"#1a1a1a"}}>送信確認</h2>
            <p style={{fontSize:"0.82rem",color:"#6b6560"}}>{targets.length}人に個別最適化ピッチを送信</p>
            <p style={{fontSize:14,color:"#c4956a",marginTop:8,fontWeight:600}}>💰 {cost}cr (残: {credits}→{credits-cost})</p>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}><button style={{...css.btnPrimary,padding:"0.8rem 2rem",fontSize:"1rem"}} onClick={sendAll}>✅ 送信 ({cost}cr)</button><button style={css.btnGhost} onClick={()=>setStep(2)}>← 戻る</button></div>
        </div>
      )}
    </div>}
  </div>;
}
const CREDIT_PACKAGES = [
  {id:"trial",credits:5,price:800,unit:160,label:"Trial",desc:"お試し",icon:"🎵",color:"#9a958e"},
  {id:"starter",credits:15,price:2000,unit:133,label:"Starter",desc:"17%お得",icon:"🎶",color:"#3b82f6"},
  {id:"standard",credits:30,price:3800,unit:127,label:"Standard",desc:"21%お得",icon:"🎸",color:"#7c3aed",pop:true},
  {id:"pro",credits:60,price:7000,unit:117,label:"Pro",desc:"27%お得",icon:"🔥",color:"#ea580c"},
  {id:"label",credits:120,price:12000,unit:100,label:"Label",desc:"38%お得・レーベル向け",icon:"🏆",color:"#f59e0b"},
];
const SUBSCRIPTION = {id:"monthly",credits:40,price:4980,unit:125,label:"月額 Artist",desc:"毎月40クレジット + 優先サポート"};
// Revenue split: 50:50 base (¥80/cr), 70:30 on acceptance (¥112/cr). Per-credit ¥160.
const CREDIT_PRICE = 160;
const CURATOR_PAY = {
  calc: (creditCost, accepted) => Math.round(creditCost * CREDIT_PRICE * (accepted ? 0.7 : 0.5)),
};

function CreditShop({user, credits, saveCredits, notify, setPage}) {
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [payMethod, setPayMethod] = useState("card"); // card, applepay, paypay
  const [payStep, setPayStep] = useState("select"); // select, payment, processing, complete
  const [cardNum, setCardNum] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load purchase history
  useEffect(() => {
    (async () => {
      const h = await S.get("otonami-purchase-history");
      if (h) setHistory(h);
    })();
  }, []);

  const formatCard = (v) => {
    const n = v.replace(/\D/g, "").substring(0, 16);
    return n.replace(/(.{4})/g, "$1 ").trim();
  };
  const formatExp = (v) => {
    const n = v.replace(/\D/g, "").substring(0, 4);
    if (n.length > 2) return n.substring(0, 2) + "/" + n.substring(2);
    return n;
  };

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    // Validate card if card payment
    if (payMethod === "card") {
      const numClean = cardNum.replace(/\s/g, "");
      if (numClean.length < 13) { notify("カード番号を入力してください", "error"); return; }
      if (cardExp.length < 5) { notify("有効期限を入力してください", "error"); return; }
      if (cardCvc.length < 3) { notify("CVCを入力してください", "error"); return; }
      if (!cardName.trim()) { notify("カード名義を入力してください", "error"); return; }
    }
    setPayStep("processing");

    // Simulate payment processing (2 seconds)
    // 📝 PRODUCTION: Replace with actual Stripe/PayPay API call
    await new Promise(r => setTimeout(r, 2000));

    const pkg = selectedPkg;
    const amount = pkg.id === "monthly" ? SUBSCRIPTION.credits : pkg.credits;
    const price = pkg.id === "monthly" ? SUBSCRIPTION.price : pkg.price;

    // Add credits
    await saveCredits(credits + amount);

    // Save purchase history
    const record = {
      id: "pur_" + Date.now(),
      packageId: pkg.id,
      label: pkg.label,
      credits: amount,
      price,
      method: payMethod === "card" ? "クレジットカード" : payMethod === "applepay" ? "Apple Pay" : "PayPay",
      cardLast4: payMethod === "card" ? cardNum.replace(/\s/g, "").slice(-4) : null,
      date: new Date().toISOString(),
    };
    const newHistory = [record, ...history].slice(0, 50);
    setHistory(newHistory);
    await S.set("otonami-purchase-history", newHistory);

    setPayStep("complete");
    notify(`✅ ${amount}クレジットを追加しました！`);
  };

  const reset = () => {
    setSelectedPkg(null); setPayStep("select"); setPayMethod("card");
    setCardNum(""); setCardExp(""); setCardCvc(""); setCardName("");
  };

  // ── Complete Screen ──
  if (payStep === "complete" && selectedPkg) {
    const amt = selectedPkg.id === "monthly" ? SUBSCRIPTION.credits : selectedPkg.credits;
    const price = selectedPkg.id === "monthly" ? SUBSCRIPTION.price : selectedPkg.price;
    return <div>
      <div style={{textAlign:"center",padding:"2rem 0"}}>
        <div style={{width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,rgba(196,149,106,0.15),rgba(196,149,106,0.35))",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:"2.5rem",marginBottom:"1.2rem"}}>✓</div>
        <h1 style={{fontSize:"1.5rem",fontWeight:800,marginBottom:"0.5rem"}}>購入完了</h1>
        <p style={{color:"#6b6560",marginBottom:"2rem"}}>ありがとうございます！</p>
      </div>
      {/* Receipt */}
      <div style={{background:"#ffffff",border:"1px solid rgba(0,0,0,0.06)",borderRadius:16,padding:"1.5rem",marginBottom:"1.5rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
          <div style={{fontWeight:800,fontSize:"0.95rem",color:"#1a1a1a"}}>OTONAMI 領収書</div>
          <div style={{fontSize:"0.72rem",color:"#9a958e"}}>{new Date().toLocaleString("ja-JP")}</div>
        </div>
        <div style={{borderTop:"1px solid rgba(0,0,0,0.05)",paddingTop:"1rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:"0.85rem",color:"#1a1a1a"}}><span>{selectedPkg.label} ({amt}クレジット)</span><span style={{fontWeight:700}}>¥{price.toLocaleString()}</span></div>
          {selectedPkg.id !== "starter" && <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:"0.78rem",color:"#10b981"}}><span>割引</span><span>-¥{(amt * 100 - price).toLocaleString()}</span></div>}
          <div style={{borderTop:"1px solid rgba(0,0,0,0.05)",paddingTop:8,display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:"0.95rem",color:"#1a1a1a"}}><span>合計（税込）</span><span>¥{price.toLocaleString()}</span></div>
        </div>
        <div style={{background:"#f0ede6",borderRadius:10,padding:"0.8rem",marginTop:"1rem",fontSize:"0.78rem",color:"#6b6560"}}>
          <div>お支払い方法: {payMethod === "card" ? "クレジットカード" : payMethod === "applepay" ? "Apple Pay" : "PayPay"}</div>
          {payMethod === "card" && cardNum && <div>カード末尾: **** {cardNum.replace(/\s/g, "").slice(-4)}</div>}
          <div>注文ID: pur_{Date.now()}</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <button onClick={()=>{reset();setPage("dashboard");}} style={css.btnPrimary}>🏠 ホームへ</button>
        <button onClick={()=>{reset();setPage("curators");}} style={{...css.btnPrimary,background:"linear-gradient(135deg,#06b6d4,#3b82f6)"}}>◎ キュレーター選択へ</button>
      </div>
    </div>;
  }

  // ── Processing Screen ──
  if (payStep === "processing") {
    return <div style={{textAlign:"center",padding:"4rem 1rem"}}>
      <div style={{width:60,height:60,border:"3px solid rgba(0,0,0,0.06)",borderTopColor:"#c4956a",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 1.5rem"}}/>
      <h2 style={{fontSize:"1.2rem",fontWeight:700,marginBottom:4,color:"#1a1a1a"}}>決済処理中...</h2>
      <p style={{fontSize:"0.82rem",color:"#6b6560"}}>{payMethod === "card" ? "カード情報を確認しています" : payMethod === "applepay" ? "Apple Payで認証中" : "PayPay決済を処理中"}</p>
    </div>;
  }

  // ── Payment Form ──
  if (payStep === "payment" && selectedPkg) {
    const pkg = selectedPkg;
    const amt = pkg.id === "monthly" ? SUBSCRIPTION.credits : pkg.credits;
    const price = pkg.id === "monthly" ? SUBSCRIPTION.price : pkg.price;
    return <div>
      <button onClick={()=>setPayStep("select")} style={{...css.btnGhost,marginBottom:"1.2rem",fontSize:"0.78rem"}}>← パッケージ選択に戻る</button>
      {/* Order Summary */}
      <div style={{background:"linear-gradient(135deg,#f5f3ff,#ecfeff)",border:"1px solid #ddd6fe",borderRadius:16,padding:"1.2rem",marginBottom:"1.5rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontWeight:800,fontSize:"1rem"}}>{pkg.label}</div><div style={{fontSize:"0.78rem",color:"#7c3aed"}}>{amt}クレジット</div></div>
          <div style={{fontSize:"1.3rem",fontWeight:800}}>¥{price.toLocaleString()}</div>
        </div>
      </div>

      {/* Payment Method Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:"1.2rem"}}>
        {[
          {id:"card",label:"💳 カード",desc:"Visa / Master / AMEX"},
          {id:"applepay",label:" Apple Pay",desc:"Touch ID / Face ID"},
          {id:"paypay",label:"₱ PayPay",desc:"QRコード決済"},
        ].map(m => (
          <button key={m.id} onClick={()=>setPayMethod(m.id)} style={{flex:1,padding:"0.7rem 0.5rem",borderRadius:12,border:payMethod===m.id?"2px solid #c4956a":"1px solid rgba(0,0,0,0.06)",background:payMethod===m.id?"rgba(196,149,106,0.08)":"#ffffff",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
            <div style={{fontWeight:payMethod===m.id?700:500,fontSize:"0.82rem",color:payMethod===m.id?"#c4956a":"#1a1a1a"}}>{m.label}</div>
            <div style={{fontSize:"0.62rem",color:"#9a958e"}}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Card Form */}
      {payMethod === "card" && <div style={{background:"#ffffff",border:"1px solid rgba(0,0,0,0.06)",borderRadius:16,padding:"1.5rem"}}>
        <div style={{display:"flex",gap:8,marginBottom:"0.5rem",alignItems:"center"}}>
          <span style={{fontSize:"1.2rem"}}>💳</span>
          <span style={{fontWeight:700,fontSize:"0.88rem"}}>カード情報</span>
          <div style={{marginLeft:"auto",display:"flex",gap:4}}>
            {["VISA","Master","AMEX","JCB"].map(b => <span key={b} style={{fontSize:"0.55rem",padding:"0.15rem 0.35rem",borderRadius:4,background:"#f0ede6",color:"#6b6560",fontWeight:600}}>{b}</span>)}
          </div>
        </div>
        <div style={{marginBottom:8}}>
          <label style={{fontSize:"0.72rem",color:"#6b6560",fontWeight:600}}>カード番号</label>
          <input value={cardNum} onChange={e=>setCardNum(formatCard(e.target.value))} placeholder="4242 4242 4242 4242" style={{...css.input,fontVariantNumeric:"tabular-nums",letterSpacing:"0.05em",fontSize:"1rem"}} maxLength={19}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div><label style={{fontSize:"0.72rem",color:"#6b6560",fontWeight:600}}>有効期限</label><input value={cardExp} onChange={e=>setCardExp(formatExp(e.target.value))} placeholder="MM/YY" style={{...css.input,fontSize:"1rem"}} maxLength={5}/></div>
          <div><label style={{fontSize:"0.72rem",color:"#6b6560",fontWeight:600}}>CVC</label><input value={cardCvc} onChange={e=>setCardCvc(e.target.value.replace(/\D/g,"").substring(0,4))} placeholder="123" type="password" style={{...css.input,fontSize:"1rem"}} maxLength={4}/></div>
        </div>
        <div><label style={{fontSize:"0.72rem",color:"#6b6560",fontWeight:600}}>カード名義</label><input value={cardName} onChange={e=>setCardName(e.target.value.toUpperCase())} placeholder="TARO YAMADA" style={{...css.input,textTransform:"uppercase",fontSize:"0.95rem"}}/></div>
        <div style={{fontSize:"0.65rem",color:"#9a958e",marginTop:4,display:"flex",alignItems:"center",gap:4}}>🔒 SSL暗号化通信 · カード情報はStripeが安全に管理します</div>
      </div>}

      {/* Apple Pay */}
      {payMethod === "applepay" && <div style={{background:"#ffffff",border:"1px solid rgba(0,0,0,0.06)",borderRadius:16,padding:"2rem",textAlign:"center"}}>
        <div style={{fontSize:"3rem",marginBottom:"0.8rem"}}></div>
        <div style={{fontWeight:700,marginBottom:4}}>Apple Pay で支払う</div>
        <div style={{fontSize:"0.78rem",color:"#6b6560",marginBottom:"1rem"}}>Touch ID または Face ID で認証</div>
        <div style={{background:"#000",color:"#fff",borderRadius:12,padding:"0.8rem",fontWeight:600,fontSize:"0.95rem",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}> Pay ¥{price.toLocaleString()}</div>
        <div style={{fontSize:"0.65rem",color:"#9a958e",marginTop:8}}>※ デモモード: 実際の決済は行われません</div>
      </div>}

      {/* PayPay */}
      {payMethod === "paypay" && <div style={{background:"#ffffff",border:"1px solid rgba(0,0,0,0.06)",borderRadius:16,padding:"2rem",textAlign:"center"}}>
        <div style={{width:80,height:80,borderRadius:16,background:"#ff0033",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:"1rem"}}>
          <span style={{color:"#fff",fontWeight:800,fontSize:"1.1rem"}}>Pay<br/>Pay</span>
        </div>
        <div style={{fontWeight:700,marginBottom:4}}>PayPay で支払う</div>
        <div style={{fontSize:"0.78rem",color:"#6b6560",marginBottom:"1rem"}}>アプリでQRコードをスキャン</div>
        {/* QR Code placeholder */}
        <div style={{width:160,height:160,margin:"0 auto",background:"#ffffff",border:"2px solid rgba(0,0,0,0.06)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{textAlign:"center"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:1,width:80,margin:"0 auto"}}>
              {Array.from({length:64}).map((_,i) => <div key={i} style={{width:8,height:8,background:Math.random()>0.5?"#1a1a1a":"#ffffff",borderRadius:1}}/>)}
            </div>
            <div style={{fontSize:"0.6rem",color:"#9a958e",marginTop:6}}>DEMO QR</div>
          </div>
        </div>
        <div style={{fontSize:"0.65rem",color:"#9a958e",marginTop:8}}>※ デモモード: 実際の決済は行われません</div>
      </div>}

      {/* Purchase Button */}
      <button onClick={handlePurchase} style={{...css.btnPrimary,width:"100%",marginTop:"1.2rem",padding:"0.9rem",fontSize:"1rem",background:"linear-gradient(135deg,#f59e0b,#ea580c)"}}>
        {payMethod === "applepay" ? " Pay で" : payMethod === "paypay" ? "PayPay で" : "💳 "}¥{price.toLocaleString()} を支払う
      </button>
      <div style={{textAlign:"center",marginTop:8,fontSize:"0.68rem",color:"#9a958e"}}>🔒 Stripe社のセキュリティ基準で保護 · PCI DSS準拠 · いつでもキャンセル可能</div>
    </div>;
  }

  // ── Package Selection Screen ──
  return <div>
    <div style={{marginBottom:"1.5rem"}}>
      <h1 style={{fontSize:"1.4rem",fontWeight:800,margin:0}}>クレジット購入</h1>
      <p style={{color:"#6b6560",fontSize:"0.85rem",margin:"0.3rem 0 0"}}>残高: <span style={{color:"#f59e0b",fontWeight:700}}>{credits}クレジット</span> · 1クレジット = ¥160基本単価 · キュレーターにより1〜4cr</p>
    </div>

    {/* Package Cards */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:"1.5rem"}}>
      {CREDIT_PACKAGES.map(pkg => {
        const selected = selectedPkg?.id === pkg.id;
        const savings = pkg.credits * 100 - pkg.price;
        return <button key={pkg.id} onClick={()=>setSelectedPkg(pkg)} style={{padding:"1.2rem",borderRadius:16,border:selected?"2px solid "+pkg.color:pkg.pop?"2px solid rgba(0,0,0,0.1)":"1px solid rgba(0,0,0,0.06)",background:selected?"rgba(196,149,106,0.08)":pkg.pop?"#ffffff":"#ffffff",cursor:"pointer",fontFamily:"inherit",textAlign:"center",position:"relative",transition:"all 0.15s"}}>
          {pkg.pop && <div style={{position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#3b82f6,#06b6d4)",color:"#fff",fontSize:"0.6rem",fontWeight:700,padding:"0.15rem 0.5rem",borderRadius:6}}>人気 No.1</div>}
          <div style={{fontSize:"1.5rem",marginBottom:4}}>{pkg.icon}</div>
          <div style={{fontWeight:800,fontSize:"1rem",color:pkg.color}}>{pkg.credits}</div>
          <div style={{fontSize:"0.72rem",color:"#6b6560"}}>クレジット</div>
          <div style={{fontSize:"1.1rem",fontWeight:800,color:"#1a1a1a",marginTop:6}}>¥{pkg.price.toLocaleString()}</div>
          <div style={{fontSize:"0.68rem",color:savings>0?"#10b981":"#9a958e",fontWeight:savings>0?600:400}}>{savings>0?"¥"+savings.toLocaleString()+"お得！":"¥"+pkg.unit+"/credit"}</div>
          <div style={{fontSize:"0.65rem",color:"#9a958e",marginTop:2}}>{pkg.desc}</div>
          {selected && <div style={{position:"absolute",top:8,right:8,width:20,height:20,borderRadius:"50%",background:pkg.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.65rem",fontWeight:700}}>✓</div>}
        </button>;
      })}
    </div>

    {/* Subscription Option */}
    <div onClick={()=>setSelectedPkg(SUBSCRIPTION)} style={{background:selectedPkg?.id==="monthly"?"rgba(196,149,106,0.08)":"#ffffff",border:selectedPkg?.id==="monthly"?"2px solid #c4956a":"1px solid rgba(0,0,0,0.06)",borderRadius:16,padding:"1.2rem",marginBottom:"1.5rem",cursor:"pointer",transition:"all 0.15s"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#c4956a,#e85d3a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem"}}>♾️</div>
          <div>
            <div style={{fontWeight:800,fontSize:"0.95rem",color:"#1a1a1a"}}>月額プラン</div>
            <div style={{fontSize:"0.75rem",color:"#c4956a"}}>{SUBSCRIPTION.desc}</div>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontWeight:800,fontSize:"1.1rem",color:"#1a1a1a"}}>¥{SUBSCRIPTION.price.toLocaleString()}<span style={{fontSize:"0.72rem",fontWeight:400,color:"#6b6560"}}>/月</span></div>
          <div style={{fontSize:"0.65rem",color:"#10b981",fontWeight:600}}>35%お得</div>
        </div>
      </div>
    </div>

    {/* Purchase CTA */}
    <button onClick={()=>{if(selectedPkg)setPayStep("payment");else notify("パッケージを選択してください","error");}} disabled={!selectedPkg} style={{...css.btnPrimary,width:"100%",padding:"0.9rem",fontSize:"1rem",background:selectedPkg?"linear-gradient(135deg,#f59e0b,#ea580c)":"rgba(0,0,0,0.06)",color:selectedPkg?"#fff":"#9a958e",cursor:selectedPkg?"pointer":"default",marginBottom:"1rem"}}>
      {selectedPkg ? "💳 決済へ進む — ¥" + (selectedPkg.id==="monthly"?SUBSCRIPTION.price:selectedPkg.price).toLocaleString() : "パッケージを選択してください"}
    </button>

    {/* Payment Methods */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:"1.5rem"}}>
      <span style={{fontSize:"0.68rem",color:"#9a958e"}}>対応決済:</span>
      {["VISA","Master","AMEX","JCB","Apple Pay","Google Pay","PayPay"].map(m => <span key={m} style={{fontSize:"0.58rem",padding:"0.15rem 0.35rem",borderRadius:4,background:"#f0ede6",color:"#6b6560",fontWeight:500}}>{m}</span>)}
    </div>

    {/* Purchase History */}
    <div style={{borderTop:"1px solid rgba(0,0,0,0.05)",paddingTop:"1rem"}}>
      <button onClick={()=>setShowHistory(!showHistory)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:"0.5rem 0"}}>
        <span style={{fontWeight:700,fontSize:"0.85rem",color:"#1a1a1a"}}>📋 購入履歴</span>
        <span style={{fontSize:"0.75rem",color:"#9a958e"}}>{showHistory?"▲":"▼"}</span>
      </button>
      {showHistory && <div>
        {history.length === 0 && <div style={{textAlign:"center",padding:"1.5rem",color:"#9a958e",fontSize:"0.82rem"}}>まだ購入履歴はありません</div>}
        {history.map(h => (
          <div key={h.id} style={{display:"flex",alignItems:"center",gap:10,padding:"0.7rem 0",borderBottom:"1px solid rgba(0,0,0,0.05)"}}>
            <div style={{width:36,height:36,borderRadius:10,background:"#f0ede6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.9rem"}}>💰</div>
            <div style={{flex:1}}>
              <div style={{fontSize:"0.82rem",fontWeight:600}}>{h.label} — {h.credits}クレジット</div>
              <div style={{fontSize:"0.68rem",color:"#9a958e"}}>{h.method}{h.cardLast4?" (****"+h.cardLast4+")":""} · {new Date(h.date).toLocaleString("ja-JP")}</div>
            </div>
            <div style={{fontWeight:700,fontSize:"0.82rem"}}>¥{h.price.toLocaleString()}</div>
          </div>
        ))}
      </div>}
    </div>

    {/* Trust Badges */}
    <div style={{background:"#ffffff",borderRadius:12,padding:"1rem",marginTop:"1rem"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
        {[{i:"🔒",l:"SSL暗号化"},{i:"🛡️",l:"PCI DSS準拠"},{i:"↩️",l:"返金保証"}].map((t,i) => <div key={i}>
          <div style={{fontSize:"1.2rem"}}>{t.i}</div>
          <div style={{fontSize:"0.65rem",color:"#6b6560",marginTop:2}}>{t.l}</div>
        </div>)}
      </div>
    </div>
  </div>;
}

// ─── Pitch Detail Modal ───
function PitchDetailModal({pitch, curators, savePitches, allPitches, onClose, notify}) {
  const [activeTab, setActiveTab] = useState('feedback');
  const [newMessage, setNewMessage] = useState('');
  const [placementPlatform, setPlacementPlatform] = useState(pitch?.placementPlatform || '');
  const [placementUrl, setPlacementUrl] = useState(pitch?.placementUrl || '');
  const [placementDate, setPlacementDate] = useState(pitch?.placementDate || '');
  const [negotiationStatus, setNegotiationStatus] = useState(pitch?.negotiationStatus || 'none');
  if (!pitch) return null;

  const curator = curators?.find(c => c.id === pitch.curatorId);
  const isLabelType = ['label','management','publisher'].includes(curator?.type);
  const messages = pitch.messages || [];

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const msg = {from:'artist', text:newMessage.trim(), timestamp:new Date().toISOString()};
    const updated = (allPitches||[]).map(p => p.id===pitch.id ? {...p, messages:[...messages, msg]} : p);
    await savePitches(updated);
    setNewMessage('');
    notify('💬 メッセージを送信しました');
  };

  const savePlacement = async () => {
    const updated = (allPitches||[]).map(p => p.id===pitch.id ? {...p, placementPlatform, placementUrl, placementDate, negotiationStatus} : p);
    await savePitches(updated);
    notify('✅ 保存しました');
  };

  const tabs = [
    ['feedback','💬 フィードバック'],
    ['placement','📍 掲載情報'],
    ['messages',`✉️ メッセージ${messages.length>0?' ('+messages.length+')':''}`],
    ...(isLabelType ? [['deal','🤝 契約交渉']] : []),
  ];

  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} onClick={onClose}>
    <div style={{background:'#ffffff',borderRadius:20,width:'100%',maxWidth:580,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
      {/* Header */}
      <div style={{padding:'1rem 1.4rem',borderBottom:'1px solid rgba(0,0,0,0.05)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(196,149,106,0.06)'}}>
        <div>
          <div style={{fontWeight:700,fontSize:'0.95rem',color:'#1a1a1a'}}>{pitch.curatorName}</div>
          <div style={{fontSize:'0.72rem',color:'#6b6560'}}>"{pitch.songTitle}" · {pitch.artistName}</div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'1px solid rgba(0,0,0,0.06)',borderRadius:8,padding:'0.3rem 0.6rem',cursor:'pointer',fontSize:'0.78rem',fontFamily:'inherit',color:'#6b6560'}}>✕</button>
      </div>
      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid rgba(0,0,0,0.05)',padding:'0 1rem',overflowX:'auto'}}>
        {tabs.map(([id,label]) => <button key={id} onClick={()=>setActiveTab(id)} style={{padding:'0.65rem 0.9rem',background:'none',border:'none',borderBottom:activeTab===id?'2px solid #c4956a':'2px solid transparent',color:activeTab===id?'#c4956a':'#6b6560',fontSize:'0.75rem',fontWeight:activeTab===id?700:400,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>{label}</button>)}
      </div>
      {/* Body */}
      <div style={{flex:1,overflowY:'auto',padding:'1.2rem 1.4rem'}}>
        {activeTab==='feedback' && <div>
          {pitch.feedbackMessage ? <>
            <div style={{fontWeight:700,fontSize:'0.82rem',marginBottom:8,color:'#1a1a1a'}}>{pitch.curatorName}からのフィードバック</div>
            <div style={{background:'#f0ede6',borderRadius:12,padding:'1rem',fontSize:'0.85rem',lineHeight:1.7,color:'#6b6560',marginBottom:10}}>{pitch.feedbackMessage}</div>
            {pitch.placementUrl && <div style={{background:'rgba(196,149,106,0.06)',borderRadius:10,padding:'0.8rem',border:'1px solid rgba(196,149,106,0.25)',fontSize:'0.82rem',color:'#c4956a',marginBottom:8}}>
              <div style={{fontWeight:700,marginBottom:4}}>🎉 掲載済み{pitch.placementPlatform ? ` — ${pitch.placementPlatform}` : ''}</div>
              <a href={pitch.placementUrl} target="_blank" rel="noopener noreferrer" style={{color:'#2563eb',fontSize:'0.78rem',wordBreak:'break-all'}}>{pitch.placementUrl}</a>
            </div>}
          </> : <div style={{textAlign:'center',padding:'2.5rem',color:'#9a958e',fontSize:'0.85rem'}}>まだフィードバックがありません<br/>キュレーターのレビュー待ちです</div>}
        </div>}

        {activeTab==='placement' && <div>
          <div style={{fontWeight:700,fontSize:'0.82rem',marginBottom:12}}>📍 掲載情報を記録</div>
          <label style={{fontSize:'0.7rem',color:'#6b6560',fontWeight:600}}>掲載プラットフォーム</label>
          <select value={placementPlatform} onChange={e=>setPlacementPlatform(e.target.value)} style={{...css.input}}>
            <option value="">選択してください</option>
            {[['youtube','YouTube'],['spotify','Spotify Playlist'],['blog','ブログ記事'],['apple_music','Apple Music'],['instagram','Instagram'],['other','その他']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <label style={{fontSize:'0.7rem',color:'#6b6560',fontWeight:600}}>掲載URL</label>
          <input value={placementUrl} onChange={e=>setPlacementUrl(e.target.value)} placeholder="https://..." style={{...css.input}}/>
          <label style={{fontSize:'0.7rem',color:'#6b6560',fontWeight:600}}>掲載日</label>
          <input type="date" value={placementDate} onChange={e=>setPlacementDate(e.target.value)} style={{...css.input}}/>
          <button onClick={savePlacement} style={{...css.btnPrimary,width:'100%',marginTop:4}}>💾 保存</button>
          {pitch.placementUrl && <div style={{marginTop:10,padding:'0.7rem',background:'rgba(196,149,106,0.06)',borderRadius:10,border:'1px solid rgba(196,149,106,0.25)',fontSize:'0.78rem'}}>
            <div style={{fontWeight:600,color:'#c4956a',marginBottom:4}}>✅ 掲載済み</div>
            <a href={pitch.placementUrl} target="_blank" rel="noopener noreferrer" style={{color:'#2563eb',fontSize:'0.75rem'}}>{pitch.placementUrl}</a>
          </div>}
        </div>}

        {activeTab==='messages' && <div>
          <div style={{fontWeight:700,fontSize:'0.82rem',marginBottom:10}}>メッセージスレッド</div>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14,minHeight:120,maxHeight:280,overflowY:'auto',padding:'0.5rem',background:'#f8f7f4',borderRadius:12,border:'1px solid rgba(0,0,0,0.05)'}}>
            {messages.length===0 && <div style={{textAlign:'center',color:'#9a958e',fontSize:'0.78rem',padding:'2rem 0'}}>まだメッセージがありません</div>}
            {messages.map((m,i) => <div key={i} style={{alignSelf:m.from==='artist'?'flex-end':'flex-start',maxWidth:'82%',background:m.from==='artist'?'#c4956a':'#1a1a1a',color:m.from==='artist'?'#fff':'#1a1a1a',borderRadius:12,padding:'0.55rem 0.85rem',fontSize:'0.8rem',border:m.from==='artist'?'none':'1px solid rgba(0,0,0,0.06)'}}>
              <div style={{fontSize:'0.6rem',opacity:0.65,marginBottom:2}}>{m.from==='artist'?'あなた':pitch.curatorName} · {new Date(m.timestamp).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
              <div>{m.text}</div>
            </div>)}
          </div>
          <div style={{display:'flex',gap:6}}>
            <input value={newMessage} onChange={e=>setNewMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder="メッセージを入力… (Enterで送信)" style={{...css.input,marginBottom:0,flex:1,fontSize:'0.82rem'}}/>
            <button onClick={sendMessage} style={{...css.btnPrimary,flexShrink:0,padding:'0.6rem 0.9rem',fontSize:'0.82rem'}}>送信</button>
          </div>
        </div>}

        {activeTab==='deal' && <div>
          <div style={{fontWeight:700,fontSize:'0.82rem',marginBottom:12}}>🤝 契約交渉ステータス</div>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
            {[['none','交渉なし','#9a958e'],['in_progress','交渉中','#f59e0b'],['deal_offered','契約提示あり','#3b82f6'],['signed','契約締結','#10b981']].map(([v,l,color]) =>
              <button key={v} onClick={()=>setNegotiationStatus(v)} style={{padding:'0.8rem 1rem',borderRadius:12,border:negotiationStatus===v?`2px solid ${color}`:'1px solid rgba(0,0,0,0.06)',background:negotiationStatus===v?color+'18':'#ffffff',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:10,textAlign:'left'}}>
                <div style={{width:12,height:12,borderRadius:'50%',background:color,flexShrink:0}}/>
                <span style={{fontWeight:negotiationStatus===v?700:400,color:negotiationStatus===v?color:'#1a1a1a',fontSize:'0.85rem'}}>{l}</span>
                {negotiationStatus===v && <span style={{marginLeft:'auto',fontSize:'0.7rem',color}}>✓ 選択中</span>}
              </button>
            )}
          </div>
          <button onClick={savePlacement} style={{...css.btnPrimary,width:'100%'}}>💾 保存</button>
        </div>}
      </div>
    </div>
  </div>;
}

// ─── Tracking ───
function Tracking({pitches, curators, notify, savePitches, allPitches, refreshPitches}) {
  const [expanded, setExpanded] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [detailPitchId, setDetailPitchId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // マウント時にDBから最新ステータスを取得
  useEffect(() => {
    if (refreshPitches) refreshPitches();
  }, []); // eslint-disable-line

  const handleRefresh = async () => {
    if (!refreshPitches || refreshing) return;
    setRefreshing(true);
    await refreshPitches();
    setRefreshing(false);
    notify('最新のステータスを取得しました');
  };
  const detailPitch = detailPitchId ? (allPitches||pitches).find(p=>p.id===detailPitchId) : null;
  const statusMap = {
    sent:     {label:"📨 Sent",      color:"#9a958e",bg:"#ffffff", icon:"📨"},
    opened:   {label:"📨 Sent",      color:"#9a958e",bg:"#ffffff", icon:"📨"},
    listened: {label:"📨 Sent",      color:"#9a958e",bg:"#ffffff", icon:"📨"},
    feedback: {label:"💬 Feedback",  color:"#10b981",bg:"rgba(16,185,129,0.1)", icon:"💬"},
    accepted: {label:"✅ Interested",color:"#059669",bg:"rgba(5,150,105,0.1)", icon:"✅"},
    interested:{label:"✅ Interested",color:"#059669",bg:"rgba(5,150,105,0.1)",icon:"✅"},
    declined: {label:"❌ Declined",  color:"#ef4444",bg:"rgba(239,68,68,0.1)", icon:"❌"},
    expired:  {label:"⏰ Expired",   color:"#f59e0b",bg:"rgba(245,158,11,0.1)", icon:"⏰"},
  };
  const steps = [
    { label: '送信', key: 'sent' },
    { label: 'FB',   key: 'feedback' },
    { label: '結果', key: 'result' },
  ];

  function getReachedStep(pitch) {
    if (['interested', 'accepted', 'declined'].includes(pitch.status)) return 3;
    if (pitch.status === 'feedback') return 2;
    return 1; // sent, opened, listened → 送信済み
  }

  function getBarColor(pitch, barIndex) {
    // Bar 2 (結果): color depends on final decision
    if (barIndex === 2) {
      if (['accepted', 'interested'].includes(pitch.status)) return '#10b981';
      if (pitch.status === 'declined') return '#ef4444';
      return 'rgba(0,0,0,0.06)';
    }
    // Bars 0-1: warm gold if reached
    return barIndex < getReachedStep(pitch) ? 'linear-gradient(90deg,#c4956a,#e85d3a)' : 'rgba(0,0,0,0.06)';
  }

  const sendReply = async (pitchId) => {
    if (!replyText.trim()) return;
    const pitch = pitches.find(p=>p.id===pitchId);
    if (!pitch) return;
    const cur = curators.find(c=>c.id===pitch.curatorId);
    // Save reply to pitch
    if (allPitches && savePitches) {
      const np = allPitches.map(p => p.id === pitchId ? {...p, artistReply: replyText.trim(), artistReplyAt: new Date().toISOString()} : p);
      await savePitches(np);
    }
    // Send email to curator
    sendEmail(EMAIL_TEMPLATES.artistReply(
      {name: pitch.artistName, email: pitch.artistEmail||"artist@example.com"},
      {email: cur?.email||"curator@example.com", name: pitch.curatorName},
      replyText.trim()
    ));
    notify("💬 返信を送信しました（メールも送信済み）");
    setReplyText(""); setReplyingTo(null);
  };

  if (pitches.length === 0) return <div style={{textAlign:"center",padding:"3rem"}}><div style={{fontSize:"2rem",marginBottom:8}}>📭</div><p style={{color:"#9a958e"}}>まだピッチを送信していません</p></div>;

  const inProgress = pitches.filter(p=>!["accepted","declined","expired"].includes(p.status)).length;
  const accepted = pitches.filter(p=>p.status==="accepted").length;

  return <div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.3rem"}}>
      <h1 style={{fontSize:"1.4rem",fontWeight:800,margin:0}}>トラッキング</h1>
      <button onClick={handleRefresh} disabled={refreshing} style={{padding:"5px 12px",fontSize:"0.78rem",fontWeight:600,border:"1px solid rgba(0,0,0,0.06)",borderRadius:8,background:"#ffffff",color:"#6b6560",cursor:refreshing?"not-allowed":"pointer",fontFamily:"inherit"}}>
        {refreshing ? '更新中...' : '↻ 更新'}
      </button>
    </div>
    <p style={{color:"#6b6560",fontSize:"0.82rem",marginBottom:"1.5rem"}}>{pitches.length}件送信 · {inProgress}件進行中 · {accepted}件採用</p>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {pitches.map(p => {
        const s = statusMap[p.status] || statusMap.sent;
        const isOpen = expanded === p.id;
        const actionInfo = p.actionType ? ACTION_TYPES.find(a=>a.id===p.actionType) : null;
        return <div key={p.id} style={{background:"#ffffff",border:`1px solid ${p.status==="accepted"?"rgba(196,149,106,0.25)":"rgba(0,0,0,0.05)"}`,borderRadius:14,padding:"1rem",cursor:"pointer",transition:"all 0.12s"}} onClick={()=>setExpanded(isOpen?null:p.id)}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:"1.1rem"}}>{s.icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:"0.88rem",color:"#1a1a1a"}}>{p.curatorName}</div>
              <div style={{fontSize:"0.72rem",color:"#9a958e"}}>{(p.curatorPlatform || curators.find(c=>c.id===p.curatorId)?.platform || '')}{p.songTitle ? ` · "${p.songTitle}"` : ''}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                <div style={{padding:"0.2rem 0.6rem",borderRadius:8,background:s.bg,color:s.color,fontSize:"0.72rem",fontWeight:600}}>{s.label}</div>
                <button onClick={e=>{e.stopPropagation();setDetailPitchId(p.id);}} style={{...css.btnSm,fontSize:"0.62rem",padding:"0.12rem 0.4rem",color:"#c4956a",border:"1px solid rgba(196,149,106,0.3)",background:"rgba(196,149,106,0.06)"}}>詳細</button>
              </div>
              {p.sentAt && <div style={{fontSize:12,color:"#6b6560",fontFamily:"'DM Sans',sans-serif"}}>{(() => { const d = new Date(p.sentAt); const now = new Date(); const isToday = d.toDateString() === now.toDateString(); const time = d.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}); return isToday ? `今日 ${time}` : `${d.getMonth()+1}/${d.getDate()} ${time}`; })()}</div>}
            </div>
          </div>
          {/* Progress bar */}
          <div style={{display:"flex",gap:2,marginTop:8}}>
            {steps.map((st,i) => {
              const barColor = getBarColor(p, i);
              const isActive = barColor !== 'rgba(0,0,0,0.06)';
              const textColor = i === 2 && p.status === 'declined' ? '#ef4444'
                : i === 2 && ['accepted','interested'].includes(p.status) ? '#10b981'
                : isActive ? '#c4956a' : '#5a5855';
              return <div key={i} style={{flex:1,textAlign:"center"}}>
                <div style={{height:3,borderRadius:3,background:barColor,marginBottom:2}}/>
                <div style={{fontSize:"0.58rem",color:textColor,fontWeight:isActive?700:400}}>{st.label}</div>
              </div>;
            })}
          </div>
          {isOpen && <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(0,0,0,0.04)",animation:"fadeIn 0.2s ease"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"0.75rem",color:"#9a958e",marginBottom:8}}>
              📨 Sent: {new Date(p.sentAt || p.createdAt).toLocaleString("ja-JP")}
            </div>

            {/* Feedback from curator */}
            {p.feedbackMessage ? (
              <div style={{background:['accepted','interested'].includes(p.status)?"rgba(196,149,106,0.06)":"#f0ede6",borderRadius:10,padding:"0.8rem",marginTop:4,border:`1px solid ${['accepted','interested'].includes(p.status)?"rgba(196,149,106,0.3)":"rgba(0,0,0,0.05)"}`}}>
                <div style={{fontWeight:700,fontSize:"0.78rem",marginBottom:6,color:['accepted','interested'].includes(p.status)?"#c4956a":"#1a1a1a"}}>
                  {['accepted','interested'].includes(p.status)?"✅":"💬"} {p.curatorName}からのフィードバック
                </div>
                <div style={{fontSize:"0.82rem",lineHeight:1.6,color:"#6b6560"}}>{p.feedbackMessage}</div>
              </div>
            ) : (
              ['feedback','accepted','interested','declined'].includes(p.status)
                ? null
                : <div style={{fontSize:"0.78rem",color:"#9a958e",padding:"0.5rem 0"}}>キュレーターのレビュー待ちです</div>
            )}

            {p.placementUrl && <div style={{marginTop:8,padding:"0.6rem 0.8rem",background:"rgba(196,149,106,0.06)",borderRadius:10,border:"1px solid rgba(196,149,106,0.3)",fontSize:"0.78rem"}}>
              <div style={{color:"#c4956a",fontWeight:700,marginBottom:4}}>🎉 掲載済み</div>
              <a href={p.placementUrl} target="_blank" rel="noopener noreferrer" style={{color:"#c4956a",wordBreak:"break-all"}}>{p.placementUrl}</a>
            </div>}

            <div style={{fontSize:"0.72rem",color:"#9a958e",marginTop:8}}>⏰ 回答期限: {(() => { const d = p.deadline ? new Date(p.deadline) : (p.sentAt ? new Date(new Date(p.sentAt).getTime() + 7*24*60*60*1000) : null); return d && d.getFullYear() > 2000 ? d.toLocaleDateString("ja-JP") : "—"; })()}</div>
          </div>}
        </div>;
      })}
    </div>
    {detailPitch && <PitchDetailModal pitch={detailPitch} curators={curators} savePitches={savePitches} allPitches={allPitches||pitches} onClose={()=>setDetailPitchId(null)} notify={notify}/>}
  </div>;
}

// ─── Analytics ───
function Analytics({pitches}) {
  const total = pitches.length || 1;
  const stats = {sent:0,opened:0,listened:0,feedback:0,accepted:0,declined:0,expired:0};
  pitches.forEach(p => { stats[p.status] = (stats[p.status]||0) + 1; });
  const cumulOpen = (stats.opened||0)+(stats.listened||0)+(stats.feedback||0)+(stats.accepted||0)+(stats.declined||0);
  const cumulListen = (stats.listened||0)+(stats.feedback||0)+(stats.accepted||0)+(stats.declined||0);
  const cumulFB = (stats.feedback||0)+(stats.accepted||0)+(stats.declined||0);
  const data = [
    {label:"送信",value:pitches.length,color:"#9a958e"},
    {label:"開封",value:cumulOpen,color:"#3b82f6"},
    {label:"試聴",value:cumulListen,color:"#8b5cf6"},
    {label:"FB",value:cumulFB,color:"#06b6d4"},
    {label:"採用",value:stats.accepted||0,color:"#10b981"},
  ];

  // Response time (average time from sent to first feedback)
  const withFB = pitches.filter(p => p.feedbackAt && p.sentAt);
  const avgResponseMs = withFB.length > 0 ? withFB.reduce((sum, p) => sum + (new Date(p.feedbackAt) - new Date(p.sentAt)), 0) / withFB.length : 0;
  const avgResponseH = Math.round(avgResponseMs / 3600000 * 10) / 10;

  // Average listen duration
  const withListen = pitches.filter(p => p.listenDuration > 0);
  const avgListen = withListen.length > 0 ? Math.round(withListen.reduce((s, p) => s + p.listenDuration, 0) / withListen.length) : 0;

  // Average rating
  const withRating = pitches.filter(p => p.rating);
  const avgRating = withRating.length > 0 ? Math.round(withRating.reduce((s, p) => s + p.rating, 0) / withRating.length * 10) / 10 : 0;

  // Genre breakdown
  const genreMap = {};
  pitches.forEach(p => {
    const g = (p.genre || "Unknown").split(",")[0].trim();
    if (!genreMap[g]) genreMap[g] = {total:0,accepted:0};
    genreMap[g].total++;
    if (p.status === "accepted") genreMap[g].accepted++;
  });
  const genreList = Object.entries(genreMap).sort((a,b) => b[1].total - a[1].total).slice(0, 5);

  // Curator performance
  const curatorMap = {};
  pitches.forEach(p => {
    if (!curatorMap[p.curatorName]) curatorMap[p.curatorName] = {total:0,accepted:0,platform:p.curatorPlatform};
    curatorMap[p.curatorName].total++;
    if (p.status === "accepted") curatorMap[p.curatorName].accepted++;
  });
  const curatorList = Object.entries(curatorMap).sort((a,b) => b[1].accepted - a[1].accepted).slice(0, 5);

  if (pitches.length === 0) return <div style={{textAlign:"center",padding:"3rem"}}><div style={{fontSize:"2rem",marginBottom:8}}>📊</div><p style={{color:"#9a958e"}}>ピッチを送信すると分析データが表示されます</p></div>;

  return <div>
    <h1 style={{fontSize:"1.4rem",fontWeight:800,marginBottom:"1.5rem"}}>分析</h1>

    {/* Key Metrics */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:8,marginBottom:"1.5rem"}}>
      {[
        {v:Math.round(stats.accepted/total*100)+"%",l:"採用率",c:"#10b981"},
        {v:Math.round(cumulOpen/total*100)+"%",l:"開封率",c:"#3b82f6"},
        {v:avgResponseH?avgResponseH+"h":"—",l:"平均応答",c:"#8b5cf6"},
        {v:avgListen?avgListen+"秒":"—",l:"平均試聴",c:"#06b6d4"},
        {v:avgRating?avgRating+"★":"—",l:"平均評価",c:"#f59e0b"},
      ].map((s,i) => <div key={i} style={{background:"#ffffff",borderRadius:12,padding:"0.8rem",border:"1px solid rgba(0,0,0,0.05)",textAlign:"center"}}>
        <div style={{fontSize:"1.2rem",fontWeight:800,color:s.c}}>{s.v}</div>
        <div style={{fontSize:"0.65rem",color:"#9a958e"}}>{s.l}</div>
      </div>)}
    </div>

    {/* Funnel */}
    <div style={{background:"#ffffff",borderRadius:16,padding:"1.5rem",border:"1px solid rgba(0,0,0,0.05)",marginBottom:"1rem"}}>
      <div style={{fontSize:"0.85rem",fontWeight:700,marginBottom:"1rem",color:"#1a1a1a"}}>📊 ファネル分析</div>
      {data.map((d,i) => <div key={i} style={{marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.78rem",marginBottom:3,color:"#1a1a1a"}}><span>{d.label}</span><span style={{fontWeight:700}}>{d.value} ({Math.round(d.value/total*100)}%)</span></div>
        <div style={{height:8,background:"rgba(0,0,0,0.05)",borderRadius:4}}><div style={{height:"100%",background:d.color,borderRadius:4,width:Math.max(2,d.value/total*100)+"%",transition:"width 0.5s"}}/></div>
      </div>)}
    </div>

    {/* Genre Breakdown */}
    {genreList.length > 0 && <div style={{background:"#ffffff",borderRadius:16,padding:"1.5rem",border:"1px solid rgba(0,0,0,0.05)",marginBottom:"1rem"}}>
      <div style={{fontSize:"0.85rem",fontWeight:700,marginBottom:"1rem",color:"#1a1a1a"}}>🎵 ジャンル別成果</div>
      {genreList.map(([g, v], i) => <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <span style={{fontSize:"0.78rem",fontWeight:600,minWidth:80,color:"#1a1a1a"}}>{g}</span>
        <div style={{flex:1,height:6,background:"rgba(0,0,0,0.05)",borderRadius:3}}><div style={{height:"100%",background:v.accepted>0?"linear-gradient(90deg,#c4956a,#10b981)":"#9a958e",borderRadius:3,width:Math.max(4,v.total/total*100)+"%"}}/></div>
        <span style={{fontSize:"0.72rem",color:"#6b6560",minWidth:50,textAlign:"right"}}>{v.accepted}/{v.total}</span>
      </div>)}
    </div>}

    {/* Top Curators */}
    {curatorList.length > 0 && <div style={{background:"#ffffff",borderRadius:16,padding:"1.5rem",border:"1px solid rgba(0,0,0,0.05)",marginBottom:"1rem"}}>
      <div style={{fontSize:"0.85rem",fontWeight:700,marginBottom:"1rem",color:"#1a1a1a"}}>🏆 キュレーター別成果</div>
      {curatorList.map(([name, v], i) => <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"0.5rem 0",borderBottom:i<curatorList.length-1?"1px solid rgba(0,0,0,0.04)":"none"}}>
        <div style={{width:24,height:24,borderRadius:6,background:v.accepted>0?"rgba(196,149,106,0.1)":"#e5e2dc",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.65rem",fontWeight:700,color:v.accepted>0?"#c4956a":"#9a958e"}}>{i+1}</div>
        <div style={{flex:1}}><div style={{fontSize:"0.82rem",fontWeight:600,color:"#1a1a1a"}}>{name}</div><div style={{fontSize:"0.68rem",color:"#9a958e"}}>{v.platform}</div></div>
        <div style={{fontSize:"0.75rem"}}>{v.accepted>0?<span style={{color:"#10b981",fontWeight:600}}>✓{v.accepted}</span>:""} <span style={{color:"#9a958e"}}>/{v.total}件</span></div>
      </div>)}
    </div>}

    {/* All Pitches List */}
    {pitches.length > 0 && <div style={{background:"#ffffff",borderRadius:16,padding:"1.5rem",border:"1px solid rgba(0,0,0,0.05)"}}>
      <div style={{fontSize:"0.85rem",fontWeight:700,marginBottom:"1rem",color:"#1a1a1a"}}>📋 全ピッチ一覧 ({pitches.length}件)</div>
      {[...pitches].sort((a,b) => new Date(b.sentAt||b.createdAt||0) - new Date(a.sentAt||a.createdAt||0)).map((p,i) => {
        const statusLabels = {sent:"📨 Sent",opened:"👀 Opened",listened:"🎧 Listened",feedback:"💬 Feedback",accepted:"✅ Accepted",interested:"✅ Interested",declined:"❌ Declined",expired:"⏰ Expired"};
        const statusColors = {sent:"#7a7870",opened:"#3b82f6",listened:"#8b5cf6",feedback:"#06b6d4",accepted:"#10b981",interested:"#10b981",declined:"#ef4444",expired:"#f59e0b"};
        const sentDate = p.sentAt ? new Date(p.sentAt) : (p.createdAt ? new Date(p.createdAt) : null);
        return <div key={p.id||i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:i<pitches.length-1?"1px solid rgba(0,0,0,0.04)":"none"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:500,color:"#1a1a1a"}}>{p.curatorName || "—"}</div>
            <div style={{fontSize:12,color:"#9a958e"}}>{p.songTitle || p.subject || "—"}</div>
          </div>
          <div style={{fontSize:12,color:"#6b6560",fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>{sentDate ? `${sentDate.getMonth()+1}/${sentDate.getDate()}` : "—"}</div>
          <div style={{padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:600,color:statusColors[p.status]||"#9a958e",background:`${statusColors[p.status]||"#9a958e"}15`}}>{statusLabels[p.status]||p.status}</div>
        </div>;
      })}
    </div>}
  </div>;
}

// ═══════════════════════════════════════
// CURATOR APP
// ═══════════════════════════════════════
function CuratorApp({user, pitches, page, setPage, savePitches, notify, updatePitch, curators, saveCurators}) {
  const myPitches = pitches.filter(p => p.curatorId === user.id);
  const pending = myPitches.filter(p => p.status === "sent" || p.status === "opened" || p.status === "listened");
  const reviewed = myPitches.filter(p => ["feedback","accepted","declined"].includes(p.status));

  const navItems = [
    {id:"curator-inbox",icon:"📥",label:"受信箱",badge:pending.length||null},
    {id:"curator-reviewed",icon:"✓",label:"レビュー済",badge:null},
    {id:"curator-profile",icon:"⚙",label:"プロフィール",badge:null},
  ];

  return <>
    <style>{`
      @media (max-width: 768px) {
        .curator-nav-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; scroll-snap-type: x mandatory; flex-wrap: nowrap !important; justify-content: flex-start !important; }
        .curator-nav-tabs button { scroll-snap-align: start; flex-shrink: 0; min-height: 44px; }
        .curator-nav-user { display: none !important; }
        .curator-main { padding: 1rem !important; }
        .curator-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .curator-action-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .curator-decision-btns { flex-direction: column !important; }
        .curator-decision-btns button { width: 100% !important; }
        .curator-star-btn { min-width: 44px !important; min-height: 44px !important; font-size: 1.8rem !important; }
        .curator-feedback-area { min-height: 120px !important; font-size: 1rem !important; }
        .curator-input-mobile { font-size: 1rem !important; min-height: 48px !important; }
        .curator-card-header { flex-direction: column !important; align-items: flex-start !important; }
        .curator-card-header-right { text-align: left !important; margin-top: 8px !important; }
        .curator-earnings-row { flex-direction: column !important; }
        .curator-earnings-row > div { width: 100%; }
        .curator-msg-input { font-size: 1rem !important; }
      }
    `}</style>
    <nav style={css.nav}>
      <div style={css.navBrand}>OTONAMI <span style={{fontSize:"0.6rem",color:"#c0bdb5",fontWeight:400}}>CURATOR</span></div>
      <div className="curator-nav-tabs" style={{display:"flex",gap:4,flex:1,justifyContent:"center"}}>
        {navItems.map(n => <button key={n.id} onClick={()=>setPage(n.id)} style={{...css.navBtn,...(page===n.id?css.navBtnActive:{})}}>{n.icon} {n.label}{n.badge && <span style={css.navBadge}>{n.badge}</span>}</button>)}
      </div>
      <div className="curator-nav-user" style={{fontSize:"0.75rem",color:"#c0bdb5"}}>{user.name}</div>
    </nav>
    <main className="curator-main" style={css.main}>
      {page==="curator-inbox" && <CuratorInbox user={user} pitches={pending} allPitches={pitches} savePitches={savePitches} notify={notify} curators={curators} saveCurators={saveCurators}/>}
      {page==="curator-reviewed" && <CuratorReviewed pitches={reviewed}/>}
      {page==="curator-profile" && <CuratorProfile user={user} curators={curators} saveCurators={saveCurators} notify={notify} stats={{total:myPitches.length,reviewed:reviewed.length,accepted:myPitches.filter(p=>p.status==="accepted").length}}/>}
    </main>
  </>;
}

// ─── Curator Inbox ───
function CuratorInbox({user, pitches, allPitches, savePitches, notify, curators, saveCurators}) {
  const [activePitch, setActivePitch] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [listenTime, setListenTime] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [actionType, setActionType] = useState(null);
  const [actionNote, setActionNote] = useState("");
  const [showDecision, setShowDecision] = useState(false);
  const [curatorMessage, setCuratorMessage] = useState("");
  const timerRef = useRef(null);

  const sendCuratorMessage = async () => {
    if (!curatorMessage.trim() || !activePitch) return;
    const msg = {from:'curator', text:curatorMessage.trim(), timestamp:new Date().toISOString()};
    const messages = [...(activePitch.messages||[]), msg];
    const np = allPitches.map(x => x.id===activePitch.id ? {...x, messages} : x);
    await savePitches(np);
    setActivePitch(prev => ({...prev, messages}));
    setCuratorMessage('');
    notify('💬 メッセージを送信しました');
  };

  const openPitch = async (p) => {
    setActivePitch(p);
    setFeedback(""); setRating(0); setIsListening(false); setListenTime(0);
    setActionType(null); setActionNote(""); setShowDecision(false); setCuratorMessage("");
    if (p.status === "sent") {
      const np = allPitches.map(x => x.id === p.id ? {...x, status:"opened", openedAt:new Date().toISOString()} : x);
      await savePitches(np);
      // Email to artist: pitch opened
      sendEmail(EMAIL_TEMPLATES.curatorOpened(
        {name: p.artistName, email: p.artistEmail||"artist@example.com"},
        {name: user.name, platform: user.platform}
      ));
    }
  };

  const startListen = async () => {
    setIsListening(true);
    if (!activePitch.listenedAt) {
      const now = new Date().toISOString();
      const np = allPitches.map(x => x.id === activePitch.id ? {
        ...x,
        status: ['sent','opened'].includes(x.status) ? 'listened' : x.status,
        listenedAt: now,
      } : x);
      await savePitches(np);
      setActivePitch(prev => ({...prev, listenedAt: now, status: ['sent','opened'].includes(prev.status) ? 'listened' : prev.status}));
    }
    timerRef.current = setInterval(() => setListenTime(t => t + 1), 1000);
  };

  const stopListen = () => {
    setIsListening(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const submitFeedback = async (decision) => {
    if (decision === "accepted" && !actionType) { notify("採用アクションを選択してください", "error"); return; }
    if (decision === "accepted" && !feedback.trim()) { notify("フィードバックを入力してください", "error"); return; }
    stopListen();
    const curCreditCost = curators.find(c=>c.id===user.id)?.creditCost || 2;
    const payment = CURATOR_PAY.calc(curCreditCost, decision === "accepted");
    const now = new Date().toISOString();
    const np = allPitches.map(x => x.id === activePitch.id ? {
      ...x,
      status: decision,
      decision,
      listenDuration: listenTime,
      curatorPayment: payment,
      actionType: decision === "accepted" ? actionType : null,
      actionNote: decision === "accepted" ? actionNote.trim() : null,
      // Only set feedbackAt/feedback if curator actually wrote feedback
      ...(feedback.trim() ? { feedback: feedback.trim(), feedbackAt: now, rating } : {}),
    } : x);
    await savePitches(np);
    // Update curator stats
    const nc = curators.map(c => c.id === user.id ? {
      ...c, stats:{...c.stats, responded:c.stats.responded+1, accepted:decision==="accepted"?c.stats.accepted+1:c.stats.accepted},
      earnings: (c.earnings||0) + payment,
    } : c);
    await saveCurators(nc);
    // Email to artist: feedback received
    const actionLabel = decision === "accepted" ? ACTION_TYPES.find(a=>a.id===actionType)?.label : null;
    sendEmail(EMAIL_TEMPLATES.curatorFeedback(
      {name: activePitch.artistName, email: activePitch.artistEmail||"artist@example.com"},
      {name: user.name, platform: user.platform},
      decision, feedback.trim(), actionLabel
    ));
    notify(decision === "accepted"
      ? `🎉 採用通知を送信しました！ (報酬: ¥${payment})`
      : `📋 フィードバックを送信しました (報酬: ¥${payment})`);
    setActivePitch(null);
  };

  useEffect(() => { return () => { if(timerRef.current) clearInterval(timerRef.current); }; }, []);

  if (activePitch) {
    const curatorData = curators.find(c=>c.id===user.id);
    const totalEarnings = curatorData?.earnings || 0;
    return <div>
      <button onClick={()=>{stopListen();setActivePitch(null);}} style={{...css.btnGhost,marginBottom:"1rem"}}>← 受信箱に戻る</button>
      <div style={{background:"#2a2a2a",border:"1px solid rgba(255,255,255,0.06)",borderRadius:20,overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:"rgba(196,149,106,0.08)",padding:"1.5rem"}}>
          <div className="curator-card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:"0.72rem",color:"#c4956a",fontWeight:600,marginBottom:4}}>NEW SUBMISSION</div>
              <h2 style={{fontSize:"1.3rem",fontWeight:800,margin:"0 0 0.3rem",color:"#f0ede6"}}>{activePitch.artistNameEn || activePitch.artistName}</h2>
              <div style={{fontSize:"0.85rem",color:"#c0bdb5"}}>{activePitch.genre} · "{activePitch.songTitle}"</div>
              {activePitch.achievements && <div style={{fontSize:"0.78rem",color:"#c4956a",marginTop:4}}>🏆 {activePitch.achievements}</div>}
            </div>
            <div className="curator-card-header-right" style={{textAlign:"right",fontSize:"0.72rem",color:"#c0bdb5"}}>
              <div>累計報酬: <span style={{color:"#10b981",fontWeight:700}}>¥{totalEarnings.toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        {/* Audio Player */}
        <div style={{padding:"1.5rem",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          {(() => {
            const embed = getEmbedInfo(activePitch.songLink);
            if (embed?.type === 'spotify') return (
              <div>
                <div style={{fontSize:"0.78rem",fontWeight:700,marginBottom:8}}>🎧 "{activePitch.songTitle}"</div>
                <iframe src={`https://open.spotify.com/embed/track/${embed.id}?theme=0`} width="100%" height="80" frameBorder="0" allow="encrypted-media" style={{borderRadius:12,display:"block"}} title="Spotify player"/>
                <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
                  <button onClick={isListening ? stopListen : startListen} style={{padding:"0.4rem 1rem",borderRadius:20,background:isListening?"#ef4444":"#c4956a",border:"none",color:"#fff",fontSize:"0.75rem",fontWeight:700,cursor:"pointer",minHeight:36}}>{isListening?"⏸ 停止":"▶ 試聴開始"}</button>
                  <span style={{fontSize:"0.88rem",fontVariantNumeric:"tabular-nums",fontWeight:600,color:"#f0ede6"}}>{Math.floor(listenTime/60)}:{(listenTime%60).toString().padStart(2,"0")}</span>
                  {isListening && <span style={{fontSize:"0.7rem",color:"#c4956a"}}>♪ 計測中…</span>}
                </div>
              </div>
            );
            if (embed?.type === 'youtube') return (
              <div>
                <div style={{fontSize:"0.78rem",fontWeight:700,marginBottom:8,color:"#f0ede6"}}>▶ "{activePitch.songTitle}"</div>
                <div style={{position:"relative",paddingBottom:"56.25%",height:0,overflow:"hidden",borderRadius:12}}>
                  <iframe src={`https://www.youtube.com/embed/${embed.id}`} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none",borderRadius:12}} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="YouTube player"/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
                  <button onClick={isListening ? stopListen : startListen} style={{padding:"0.4rem 1rem",borderRadius:20,background:isListening?"#ef4444":"#c4956a",border:"none",color:"#fff",fontSize:"0.75rem",fontWeight:700,cursor:"pointer",minHeight:36}}>{isListening?"⏸ 停止":"▶ 試聴開始"}</button>
                  <span style={{fontSize:"0.88rem",fontVariantNumeric:"tabular-nums",fontWeight:600,color:"#f0ede6"}}>{Math.floor(listenTime/60)}:{(listenTime%60).toString().padStart(2,"0")}</span>
                  {isListening && <span style={{fontSize:"0.7rem",color:"#c4956a"}}>♪ 計測中…</span>}
                </div>
              </div>
            );
            // Fallback: no embeddable URL — show mock player with timer
            return (
              <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81)",borderRadius:16,padding:"1.2rem",color:"#fff",textAlign:"center"}}>
                <div style={{fontSize:"1.5rem",marginBottom:8}}>🎵</div>
                <div style={{fontWeight:700,marginBottom:4}}>"{activePitch.songTitle}"</div>
                {activePitch.songLink && <div style={{fontSize:"0.72rem",color:"#a5b4fc",marginBottom:12}}>{activePitch.songLink}</div>}
                <div style={{display:"flex",alignItems:"center",gap:12,justifyContent:"center"}}>
                  <button onClick={isListening ? stopListen : startListen} style={{width:48,height:48,borderRadius:"50%",background:isListening?"#ef4444":"#10b981",border:"none",color:"#fff",fontSize:"1.2rem",cursor:"pointer"}}>{isListening?"⏸":"▶"}</button>
                  <div style={{fontSize:"1.5rem",fontWeight:700,fontVariantNumeric:"tabular-nums",minWidth:60}}>{Math.floor(listenTime/60)}:{(listenTime%60).toString().padStart(2,"0")}</div>
                </div>
                {isListening && <div style={{fontSize:"0.72rem",color:"#a5b4fc",marginTop:8,animation:"pulse 1.5s infinite"}}>♪ 再生中...</div>}
              </div>
            );
          })()}
        </div>

        {/* Pitch Message */}
        <div style={{padding:"1.5rem",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{fontSize:"0.82rem",fontWeight:700,marginBottom:8,color:"#f0ede6"}}>📝 アーティストからのメッセージ</div>
          <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:"0.82rem",lineHeight:1.6,color:"#c0bdb5",margin:0,background:"#333333",borderRadius:10,padding:"1rem"}}>{activePitch.pitchText}</pre>
        </div>

        {/* Message Thread */}
        <div style={{padding:"1rem 1.5rem",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{fontSize:"0.82rem",fontWeight:700,marginBottom:8}}>💬 メッセージ ({(activePitch.messages||[]).length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:10,minHeight:60,maxHeight:200,overflowY:"auto",padding:"0.6rem",background:"#1a1a1a",borderRadius:12,border:"1px solid rgba(255,255,255,0.04)"}}>
            {(activePitch.messages||[]).length===0 && <div style={{textAlign:"center",color:"#7a7870",fontSize:"0.75rem",padding:"0.8rem 0"}}>まだメッセージがありません</div>}
            {(activePitch.messages||[]).map((m,i) => <div key={i} style={{alignSelf:m.from==="curator"?"flex-end":"flex-start",maxWidth:"80%",background:m.from==="curator"?"#c4956a":"#333333",color:m.from==="curator"?"#fff":"#f0ede6",borderRadius:10,padding:"0.45rem 0.75rem",fontSize:"0.78rem",border:m.from==="curator"?"none":"1px solid rgba(255,255,255,0.08)"}}>
              <div style={{fontSize:"0.58rem",opacity:0.65,marginBottom:1}}>{m.from==="curator"?"あなた":activePitch.artistName}</div>
              <div>{m.text}</div>
            </div>)}
          </div>
          <div style={{display:"flex",gap:5}}>
            <input value={curatorMessage} onChange={e=>setCuratorMessage(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendCuratorMessage();}}} placeholder="アーティストへメッセージ…" className="curator-msg-input" style={{...css.input,marginBottom:0,flex:1,fontSize:"0.8rem"}}/>
            <button onClick={sendCuratorMessage} style={{...css.btnSm,background:"#c4956a",color:"#fff",border:"none",fontWeight:600,padding:"0.5rem 0.8rem",minHeight:44,minWidth:44}}>送信</button>
          </div>
        </div>

        {/* Feedback Form */}
        <div style={{padding:"1.5rem"}}>
          <div style={{fontSize:"0.88rem",fontWeight:700,marginBottom:"1rem"}}>あなたのフィードバック</div>

          {/* Rating */}
          <div style={{marginBottom:"1rem"}}>
            <div style={{fontSize:"0.78rem",color:"#c0bdb5",marginBottom:6}}>評価</div>
            <div style={{display:"flex",gap:4}}>
              {[1,2,3,4,5].map(n => <button key={n} onClick={()=>setRating(n)} className="curator-star-btn" style={{fontSize:"1.5rem",background:"none",border:"none",cursor:"pointer",opacity:n<=rating?1:0.25,minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>{n<=rating?"★":"☆"}</button>)}
            </div>
          </div>

          {/* Feedback text */}
          <textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="この曲についてのフィードバックを書いてください。建設的で具体的なコメントが喜ばれます。（15文字以上）" rows={4} className="curator-feedback-area" style={{...css.input,minHeight:100,resize:"vertical",fontSize:"0.88rem"}}/>

          {/* Decision Section */}
          {!showDecision ? (
            <button onClick={()=>{
              if(!feedback.trim()||feedback.trim().length<15){notify("フィードバックを15文字以上入力してください","error");return;}
              if(!rating){notify("評価を選択してください","error");return;}
              setShowDecision(true);
            }} style={{...css.btnPrimary,width:"100%",marginTop:4}}>次へ: 採用/不採用を選択 →</button>
          ) : (
            <div style={{marginTop:"1rem",animation:"fadeIn 0.2s ease"}}>
              {/* Revenue Info */}
              <div style={{background:"#333333",borderRadius:12,padding:"1rem",marginBottom:"1rem",fontSize:"0.78rem"}}>
                <div style={{fontWeight:700,marginBottom:6,color:"#f0ede6"}}>💰 レビュー報酬（{curatorData?.creditCost||2}クレジットキュレーター）</div>
                <div className="curator-earnings-row" style={{display:"flex",gap:12}}>
                  <div style={{flex:1,textAlign:"center",padding:"0.5rem",borderRadius:8,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)"}}>
                    <div style={{fontWeight:800,color:"#10b981",fontSize:"1.1rem"}}>¥{CURATOR_PAY.calc(curatorData?.creditCost||2,true)}</div>
                    <div style={{fontSize:"0.68rem",color:"#16a34a"}}>採用時（70%）</div>
                  </div>
                  <div style={{flex:1,textAlign:"center",padding:"0.5rem",borderRadius:8,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)"}}>
                    <div style={{fontWeight:800,color:"#c0bdb5",fontSize:"1.1rem"}}>¥{CURATOR_PAY.calc(curatorData?.creditCost||2,false)}</div>
                    <div style={{fontSize:"0.68rem",color:"#7a7870"}}>不採用時（50%）</div>
                  </div>
                </div>
              </div>

              {/* Accept: Action Type Selection */}
              <div style={{marginBottom:"1rem"}}>
                <div style={{fontSize:"0.82rem",fontWeight:700,marginBottom:8}}>🎯 採用する場合のアクション</div>
                <div className="curator-action-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                  {ACTION_TYPES.map(a => (
                    <button key={a.id} onClick={()=>setActionType(a.id)} style={{padding:"0.6rem",borderRadius:10,border:actionType===a.id?"2px solid #10b981":"1px solid rgba(255,255,255,0.08)",background:actionType===a.id?"rgba(16,185,129,0.12)":"#333333",cursor:"pointer",fontFamily:"inherit",textAlign:"center",fontSize:"0.72rem",minHeight:44}}>
                      <div style={{fontSize:"1rem"}}>{a.icon}</div>
                      <div style={{fontWeight:actionType===a.id?700:500,color:actionType===a.id?"#10b981":"#f0ede6"}}>{a.label}</div>
                    </button>
                  ))}
                </div>
                {actionType && <input value={actionNote} onChange={e=>setActionNote(e.target.value)} placeholder={`${ACTION_TYPES.find(a=>a.id===actionType)?.desc}の詳細（プレイリスト名、掲載URLなど）`} className="curator-input-mobile" style={{...css.input,marginTop:8,fontSize:"0.82rem"}}/>}
              </div>

              {/* Decision Buttons */}
              <div className="curator-decision-btns" style={{display:"flex",gap:8}}>
                <button onClick={()=>submitFeedback("accepted")} disabled={!actionType} style={{...css.btnPrimary,background:actionType?"linear-gradient(135deg,#10b981,#06b6d4)":"rgba(255,255,255,0.08)",color:actionType?"#fff":"#7a7870",flex:1,minHeight:48}}>🎉 採用（¥{CURATOR_PAY.calc(curatorData?.creditCost||2,true)}獲得）</button>
                <button onClick={()=>submitFeedback("declined")} style={{...css.btnGhost,flex:1,minHeight:48}}>📋 不採用（¥{CURATOR_PAY.calc(curatorData?.creditCost||2,false)}獲得）</button>
              </div>
              <div style={{textAlign:"center",fontSize:"0.68rem",color:"#7a7870",marginTop:6}}>📧 アーティストにメール通知が自動送信されます</div>
            </div>
          )}
        </div>
      </div>
    </div>;
  }

  return <div>
    <h1 style={{fontSize:"1.4rem",fontWeight:800,marginBottom:"0.3rem"}}>受信箱</h1>
    <p style={{color:"#c0bdb5",fontSize:"0.82rem",marginBottom:"1.5rem"}}>{pitches.length}件の未レビューピッチ · 7日以内にフィードバック必須</p>
    {pitches.length === 0 && <div style={{textAlign:"center",padding:"3rem",color:"#7a7870"}}><div style={{fontSize:"2rem",marginBottom:8}}>📭</div><p>新しいピッチはまだありません</p></div>}
    {pitches.map(p => {
      const daysLeft = Math.max(0, Math.ceil((new Date(p.deadline) - Date.now()) / (24*60*60*1000)));
      return <div key={p.id} onClick={()=>openPitch(p)} style={{background:"#2a2a2a",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"1rem",marginBottom:8,cursor:"pointer",transition:"all 0.12s"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"rgba(196,149,106,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem"}}>🎵</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:"0.88rem",color:"#f0ede6"}}>{p.artistNameEn || p.artistName}</div>
            <div style={{fontSize:"0.75rem",color:"#c0bdb5"}}>{p.genre} · "{p.songTitle}"</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"0.72rem",color:daysLeft<=2?"#ef4444":"#c0bdb5",fontWeight:daysLeft<=2?700:400}}>{daysLeft}日残り</div>
            <div style={{fontSize:"0.65rem",color:"#7a7870"}}>{new Date(p.sentAt || p.createdAt).toLocaleDateString("ja-JP")}</div>
          </div>
        </div>
      </div>;
    })}
  </div>;
}

// ─── Curator Reviewed ───
function CuratorReviewed({pitches}) {
  const totalEarnings = pitches.reduce((sum, p) => sum + (p.curatorPayment || CURATOR_PAY.calc(p.creditCost||2, p.status==="accepted")), 0);
  return <div>
    <h1 style={{fontSize:"1.4rem",fontWeight:800,marginBottom:"0.3rem"}}>レビュー済み ({pitches.length}件)</h1>
    <div style={{display:"flex",gap:8,marginBottom:"1.5rem"}}>
      <div style={{flex:1,background:"rgba(16,185,129,0.1)",borderRadius:10,padding:"0.8rem",textAlign:"center"}}>
        <div style={{fontSize:"1.2rem",fontWeight:800,color:"#10b981"}}>¥{totalEarnings.toLocaleString()}</div>
        <div style={{fontSize:"0.68rem",color:"#16a34a"}}>累計報酬</div>
      </div>
      <div style={{flex:1,background:"rgba(196,149,106,0.08)",borderRadius:10,padding:"0.8rem",textAlign:"center"}}>
        <div style={{fontSize:"1.2rem",fontWeight:800,color:"#c4956a"}}>{pitches.filter(p=>p.status==="accepted").length}</div>
        <div style={{fontSize:"0.68rem",color:"#c4956a"}}>採用</div>
      </div>
      <div style={{flex:1,background:"#2a2a2a",borderRadius:10,padding:"0.8rem",textAlign:"center"}}>
        <div style={{fontSize:"1.2rem",fontWeight:800,color:"#c0bdb5"}}>{pitches.filter(p=>p.status==="declined").length}</div>
        <div style={{fontSize:"0.68rem",color:"#7a7870"}}>不採用</div>
      </div>
    </div>
    {pitches.map(p => {
      const actionInfo = p.actionType ? ACTION_TYPES.find(a=>a.id===p.actionType) : null;
      const payment = p.curatorPayment || CURATOR_PAY.calc(p.creditCost||2, p.status==="accepted");
      return <div key={p.id} style={{background:"#2a2a2a",border:`1px solid ${p.status==="accepted"?"rgba(196,149,106,0.25)":"rgba(255,255,255,0.06)"}`,borderRadius:14,padding:"1rem",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:"1rem"}}>{p.status==="accepted"?"🎉":"📋"}</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:"0.88rem",color:"#f0ede6"}}>{p.artistNameEn||p.artistName}</div>
            <div style={{fontSize:"0.72rem",color:"#c0bdb5"}}>"{p.songTitle}" · {p.genre}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <span style={{padding:"0.2rem 0.6rem",borderRadius:8,background:p.status==="accepted"?"#dcfce7":"#fef2f2",color:p.status==="accepted"?"#16a34a":"#ef4444",fontSize:"0.72rem",fontWeight:600}}>{p.status==="accepted"?"採用":"不採用"}</span>
            <div style={{fontSize:"0.68rem",color:"#10b981",fontWeight:600,marginTop:4}}>¥{payment}</div>
          </div>
        </div>
        {actionInfo && <div style={{fontSize:"0.75rem",color:"#16a34a",marginTop:6}}>
          {actionInfo.icon} {actionInfo.label}{p.actionNote ? ` — ${p.actionNote}` : ""}
        </div>}
        {p.feedback && <div style={{fontSize:"0.78rem",color:"#c0bdb5",marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.04)"}}>{p.feedback}</div>}
        {p.artistReply && <div style={{fontSize:"0.75rem",color:"#c4956a",marginTop:6,paddingTop:6,borderTop:"1px solid rgba(196,149,106,0.1)"}}>
          💬 アーティストからの返信: {p.artistReply}
        </div>}
        {p.feedbackAt && <div style={{fontSize:"0.65rem",color:"#7a7870",marginTop:4}}>{new Date(p.feedbackAt).toLocaleString("ja-JP")}</div>}
      </div>;
    })}
  </div>;
}

// ─── Curator Profile ───
function CuratorProfile({user, curators, saveCurators, notify, stats}) {
  const curatorData = curators.find(c=>c.id===user.id);
  const earnings = curatorData?.earnings || 0;
  return <div>
    <h1 style={{fontSize:"1.4rem",fontWeight:800,marginBottom:"1.5rem"}}>プロフィール</h1>
    <div style={{background:"#2a2a2a",borderRadius:16,padding:"1.5rem",border:"1px solid rgba(255,255,255,0.06)",marginBottom:"1rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:"1rem"}}>
        <div style={{width:56,height:56,borderRadius:14,background:"linear-gradient(135deg,#c4956a,#e85d3a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem"}}>{user.avatar}</div>
        <div><div style={{fontWeight:800,fontSize:"1.1rem",color:"#f0ede6"}}>{user.name}</div><div style={{fontSize:"0.82rem",color:"#c0bdb5"}}>{user.platform}</div></div>
      </div>
      <div className="curator-stats-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        <div style={{textAlign:"center",background:"#333333",borderRadius:10,padding:"0.8rem"}}><div style={{fontSize:"1.3rem",fontWeight:800,color:"#3b82f6"}}>{stats.total}</div><div style={{fontSize:"0.68rem",color:"#7a7870"}}>受信</div></div>
        <div style={{textAlign:"center",background:"#333333",borderRadius:10,padding:"0.8rem"}}><div style={{fontSize:"1.3rem",fontWeight:800,color:"#8b5cf6"}}>{stats.reviewed}</div><div style={{fontSize:"0.68rem",color:"#7a7870"}}>レビュー</div></div>
        <div style={{textAlign:"center",background:"#333333",borderRadius:10,padding:"0.8rem"}}><div style={{fontSize:"1.3rem",fontWeight:800,color:"#10b981"}}>{stats.accepted}</div><div style={{fontSize:"0.68rem",color:"#7a7870"}}>採用</div></div>
        <div style={{textAlign:"center",background:"rgba(196,149,106,0.1)",borderRadius:10,padding:"0.8rem",border:"1px solid rgba(196,149,106,0.25)"}}><div style={{fontSize:"1.3rem",fontWeight:800,color:"#10b981"}}>¥{earnings.toLocaleString()}</div><div style={{fontSize:"0.68rem",color:"#16a34a"}}>報酬</div></div>
      </div>
    </div>
    {/* Revenue Split Info */}
    <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:16,padding:"1.2rem",marginBottom:"1rem"}}>
      <div style={{fontWeight:700,fontSize:"0.85rem",color:"#92400e",marginBottom:6}}>💰 報酬体系</div>
      <div style={{display:"flex",gap:12,fontSize:"0.78rem"}}>
        <div><span style={{fontWeight:700,color:"#10b981"}}>¥{CURATOR_PAY.calc(curatorData?.creditCost||2,true)}</span> / 採用時（70%）</div>
        <div><span style={{fontWeight:700,color:"#c0bdb5"}}>¥{CURATOR_PAY.calc(curatorData?.creditCost||2,false)}</span> / 不採用時（50%）</div>
      </div>
      <div style={{fontSize:"0.72rem",color:"#a16207",marginTop:6}}>7日以内にフィードバックがない場合、報酬は発生しません</div>
    </div>
    <div style={{background:"#2a2a2a",borderRadius:16,padding:"1.5rem",border:"1px solid rgba(255,255,255,0.06)"}}>
      <div style={{fontSize:"0.85rem",fontWeight:700,marginBottom:8,color:"#f0ede6"}}>受付ジャンル</div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:"1rem"}}>{user.genres?.map(g=><span key={g} style={{fontSize:"0.72rem",padding:"0.2rem 0.6rem",borderRadius:6,background:"rgba(196,149,106,0.1)",color:"#c4956a"}}>{g}</span>)}</div>
      <div style={{fontSize:"0.85rem",fontWeight:700,marginBottom:4,color:"#f0ede6"}}>提供サービス</div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{user.offers?.map(o=><span key={o} style={{fontSize:"0.72rem",padding:"0.2rem 0.6rem",borderRadius:6,background:"rgba(196,149,106,0.08)",color:"#c4956a"}}>{o}</span>)}</div>
    </div>
  </div>;
}

// ═══════════════════════════════════════
// STYLES
// ═══════════════════════════════════════
const css = {
  shell:{fontFamily:"'DM Sans',system-ui,sans-serif",minHeight:"100vh",background:"#f8f7f4",color:"#1a1a1a"},
  nav:{display:"flex",alignItems:"center",padding:"0.6rem 1.5rem",borderBottom:"1px solid #e5e2dc",background:"rgba(248,247,244,0.92)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:50},
  navBrand:{fontSize:"1.1rem",fontWeight:800,color:"#1a1a1a",marginRight:16,fontFamily:"'Playfair Display',Georgia,serif",letterSpacing:"2px"},
  navBtn:{background:"none",border:"none",padding:"0.45rem 0.7rem",borderRadius:20,fontSize:"0.75rem",color:"#6b6560",cursor:"pointer",fontFamily:"inherit",position:"relative",fontWeight:500},
  navBtnActive:{background:"rgba(196,149,106,0.12)",color:"#c4956a",fontWeight:700},
  navBadge:{position:"absolute",top:-2,right:-4,background:"#ef4444",color:"#fff",fontSize:"0.55rem",width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700},
  main:{maxWidth:720,margin:"0 auto",padding:"1.5rem"},
  toast:{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",padding:"0.7rem 1.4rem",borderRadius:14,color:"#fff",fontSize:"0.85rem",fontWeight:600,zIndex:100,boxShadow:"0 8px 30px rgba(0,0,0,0.12)",animation:"fadeIn 0.3s ease"},
  btnPrimary:{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:"0.7rem 1.4rem",background:"#e85d3a",color:"#fff",border:"none",borderRadius:12,fontSize:"0.88rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(232,93,58,0.25)"},
  btnGhost:{display:"inline-flex",alignItems:"center",gap:6,padding:"0.65rem 1rem",background:"transparent",color:"#6b6560",border:"1px solid #e5e2dc",borderRadius:12,fontSize:"0.82rem",fontWeight:500,cursor:"pointer",fontFamily:"inherit"},
  btnSm:{padding:"0.3rem 0.7rem",borderRadius:8,fontSize:"0.72rem",border:"1px solid #e5e2dc",background:"#ffffff",cursor:"pointer",fontFamily:"inherit",color:"#6b6560"},
  input:{width:"100%",padding:"0.7rem 0.9rem",border:"1px solid #e5e2dc",borderRadius:10,fontSize:"0.85rem",fontFamily:"inherit",outline:"none",marginBottom:8,background:"#ffffff",color:"#1a1a1a"},
  authInput:{width:"100%",padding:"0.7rem 0.9rem",border:"1px solid #e5e2dc",borderRadius:10,fontSize:"0.85rem",fontFamily:"inherit",outline:"none",marginBottom:8,background:"#ffffff",color:"#1a1a1a"},
  filterInput:{padding:"0.55rem 0.8rem",border:"1px solid #e5e2dc",borderRadius:10,fontSize:"0.82rem",fontFamily:"inherit",outline:"none",flex:"1 1 150px",minWidth:120,background:"#ffffff",color:"#1a1a1a"},
  filterSelect:{padding:"0.55rem 0.8rem",border:"1px solid #e5e2dc",borderRadius:10,fontSize:"0.82rem",fontFamily:"inherit",outline:"none",background:"#ffffff",color:"#1a1a1a"},
};
