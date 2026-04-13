'use client';
import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TEMPLATES, ANIMATIONS, renderFrame, getCanvasDimensions } from '@/lib/lyric-video';

const THEME = {
  bg: '#0f0f0f',
  card: '#1a1a1a',
  border: '#2a2a2a',
  text: '#f5f2ec',
  textSub: '#a8a39b',
  textMuted: '#6b6560',
  coral: '#FF6B4A',
  pink: '#FF3D6E',
  purple: '#A78BFA',
  teal: '#4ECDC4',
  gold: '#c4956a',
  font: "'DM Sans', -apple-system, sans-serif",
  fontHead: "'Sora', -apple-system, sans-serif",
};

function LyricVideoEditor() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Upload state
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [backgroundUrl, setBackgroundUrl] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [title, setTitle] = useState('');
  const [videoId, setVideoId] = useState(null);

  // Transcribe state
  const [segments, setSegments] = useState([]);
  const [language, setLanguage] = useState('ja');
  const [duration, setDuration] = useState(0);

  // Preview state
  const [selectedTemplate, setSelectedTemplate] = useState('neon-city');
  const [selectedAnimation, setSelectedAnimation] = useState('fade-in');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Refs
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioSourceRef = useRef(null);
  const audioDestRef = useRef(null);

  // Prefill title from query params
  useEffect(() => {
    const t = searchParams.get('title');
    if (t) setTitle(decodeURIComponent(t));
  }, [searchParams]);

  // Load background image into HTMLImageElement for Canvas
  useEffect(() => {
    if (!backgroundUrl) {
      setBackgroundImage(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setBackgroundImage(img);
    img.onerror = () => setBackgroundImage(null);
    img.src = backgroundUrl;
  }, [backgroundUrl]);

  // === Step 1: Upload ===
  const handleUpload = async () => {
    setError('');
    if (!audioFile) {
      setError('音源ファイルを選択してください');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('artist_token');
      if (!token) {
        setError('ログインが必要です');
        setLoading(false);
        return;
      }
      // Step 1: Ask the server for signed upload URLs (JSON in / JSON out — no file bytes).
      // This avoids Vercel's 4.5 MB request-body limit on Functions.
      const fallbackTitle = (audioFile.name || '').replace(/\.[^.]+$/, '') || 'Untitled';
      const initRes = await fetch('/api/lyric-video/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          audioMime: audioFile.type,
          backgroundMime: backgroundFile?.type || null,
          title: title || fallbackTitle,
        }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) {
        const detail = initData.details ? `${initData.error}: ${initData.details}` : initData.error;
        throw new Error(detail || 'Upload initialization failed');
      }

      // Step 2: Upload audio directly to Supabase Storage via the signed URL.
      // Rename the Blob to an ASCII-safe filename to avoid any filename-based
      // validation at the HTTP layer.
      await directUpload(initData.audio.uploadUrl, audioFile, `audio.${initData.audio.ext}`);

      // Step 3: Upload background image (best-effort — non-fatal if it fails).
      if (initData.background && backgroundFile) {
        try {
          await directUpload(
            initData.background.uploadUrl,
            backgroundFile,
            `background.${initData.background.ext}`
          );
        } catch (bgErr) {
          console.warn('Background upload failed, proceeding without it:', bgErr);
        }
      }

      setAudioUrl(initData.audio.publicUrl);
      setBackgroundUrl(initData.background?.publicUrl || null);
      setVideoId(initData.id);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // === Step 2: Transcribe ===
  const handleTranscribe = async () => {
    setError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('artist_token');
      const res = await fetch('/api/lyric-video/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ audioUrl, videoId, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transcription failed');
      setSegments(data.segments || []);
      setDuration(data.duration || 0);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update a segment's text
  const updateSegmentText = (idx, newText) => {
    setSegments((prev) => prev.map((seg, i) => (i === idx ? { ...seg, text: newText } : seg)));
  };

  // === Step 3: Preview animation loop ===
  const renderCurrentFrame = useCallback(
    (time) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const { width, height } = getCanvasDimensions(aspectRatio);
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      renderFrame(ctx, {
        width,
        height,
        backgroundImage,
        template: TEMPLATES[selectedTemplate],
        currentTime: time,
        segments,
        animation: selectedAnimation,
      });
    },
    [aspectRatio, backgroundImage, selectedTemplate, segments, selectedAnimation]
  );

  // Redraw when template/animation/aspect changes
  useEffect(() => {
    if (step >= 3) renderCurrentFrame(currentTime);
  }, [step, selectedTemplate, selectedAnimation, aspectRatio, backgroundImage, renderCurrentFrame, currentTime]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    } else {
      audio.play();
      setIsPlaying(true);
      const loop = () => {
        setCurrentTime(audio.currentTime);
        renderCurrentFrame(audio.currentTime);
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      loop();
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // === Step 4: Export via MediaRecorder ===
  const handleExport = async () => {
    setError('');
    setIsExporting(true);
    setExportProgress(0);
    try {
      const canvas = canvasRef.current;
      const audio = audioRef.current;
      if (!canvas || !audio) throw new Error('Canvas or audio not ready');

      const { width, height } = getCanvasDimensions(aspectRatio);
      canvas.width = width;
      canvas.height = height;

      const canvasStream = canvas.captureStream(30);
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaElementSource(audio);
        const destination = audioCtx.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioCtx.destination);
        audioCtxRef.current = audioCtx;
        audioSourceRef.current = source;
        audioDestRef.current = destination;
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const destination = audioDestRef.current;

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 5_000_000,
      });
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const progressInterval = setInterval(() => {
        if (audio.duration > 0) {
          setExportProgress(Math.round((audio.currentTime / audio.duration) * 100));
        }
      }, 300);

      mediaRecorder.onstop = () => {
        clearInterval(progressInterval);
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(title || 'lyric-video').replace(/[^\w\-一-龯ぁ-んァ-ヶー]/g, '_')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExporting(false);
        setExportProgress(100);
      };

      audio.currentTime = 0;
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      await audio.play();
      setIsPlaying(true);

      const renderLoop = () => {
        if (mediaRecorder.state !== 'recording') return;
        setCurrentTime(audio.currentTime);
        renderCurrentFrame(audio.currentTime);
        animationFrameRef.current = requestAnimationFrame(renderLoop);
      };
      renderLoop();

      audio.onended = () => {
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
        setIsPlaying(false);
      };
    } catch (err) {
      console.error(err);
      setError(err.message);
      setIsExporting(false);
    }
  };

  // === RENDER ===
  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, color: THEME.text, fontFamily: THEME.font, padding: '24px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontFamily: THEME.fontHead, fontWeight: 800, fontSize: 28, margin: '0 0 8px 0', background: `linear-gradient(135deg, ${THEME.coral}, ${THEME.pink}, ${THEME.purple})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🎬 リリックMV ジェネレーター
        </h1>
        <p style={{ color: THEME.textSub, fontSize: 14, margin: '0 0 24px 0' }}>
          楽曲をアップロード → AI歌詞書き起こし → テンプレート選択 → 動画エクスポート
        </p>

        <StepBar step={step} />

        {error && (
          <div style={{ padding: 14, marginBottom: 16, background: 'rgba(255, 61, 110, 0.12)', border: `1px solid ${THEME.pink}`, borderRadius: 10, color: THEME.pink, fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {step === 1 && (
          <StepUpload
            title={title} setTitle={setTitle}
            audioFile={audioFile} setAudioFile={setAudioFile}
            backgroundFile={backgroundFile} setBackgroundFile={setBackgroundFile}
            onUpload={handleUpload} loading={loading}
          />
        )}

        {step === 2 && (
          <StepTranscribe
            language={language} setLanguage={setLanguage}
            onTranscribe={handleTranscribe} loading={loading}
            audioUrl={audioUrl}
          />
        )}

        {step >= 3 && (
          <StepPreview
            canvasRef={canvasRef} audioRef={audioRef} audioUrl={audioUrl}
            selectedTemplate={selectedTemplate} setSelectedTemplate={setSelectedTemplate}
            selectedAnimation={selectedAnimation} setSelectedAnimation={setSelectedAnimation}
            aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
            segments={segments} updateSegmentText={updateSegmentText}
            isPlaying={isPlaying} togglePlayback={togglePlayback}
            currentTime={currentTime} duration={duration}
            onExport={handleExport} isExporting={isExporting} exportProgress={exportProgress}
          />
        )}
      </div>
    </div>
  );
}

function StepBar({ step }) {
  const steps = [
    { n: 1, label: 'アップロード' },
    { n: 2, label: '歌詞書き起こし' },
    { n: 3, label: 'プレビュー' },
    { n: 4, label: 'エクスポート' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
      {steps.map((s) => {
        const active = step >= s.n;
        return (
          <div key={s.n} style={{
            flex: '1 1 140px', minWidth: 120, padding: '10px 14px',
            background: active ? `linear-gradient(135deg, ${THEME.coral}20, ${THEME.pink}20)` : THEME.card,
            border: `1px solid ${active ? THEME.coral : THEME.border}`, borderRadius: 10,
            color: active ? THEME.text : THEME.textMuted, fontSize: 13, fontWeight: 600,
            textAlign: 'center',
          }}>
            {s.n}. {s.label}
          </div>
        );
      })}
    </div>
  );
}

function StepUpload({ title, setTitle, audioFile, setAudioFile, backgroundFile, setBackgroundFile, onUpload, loading }) {
  return (
    <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 24 }}>
      <h2 style={{ fontFamily: THEME.fontHead, fontSize: 20, margin: '0 0 16px 0' }}>ステップ 1: ファイルを選択</h2>

      <label style={{ display: 'block', fontSize: 13, color: THEME.textSub, marginBottom: 6 }}>タイトル</label>
      <input
        type="text" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="楽曲タイトル"
        style={{ width: '100%', padding: 12, background: THEME.bg, border: `1px solid ${THEME.border}`, borderRadius: 8, color: THEME.text, fontSize: 14, fontFamily: THEME.font, marginBottom: 20 }}
      />

      <FileDrop
        label="音源ファイル (MP3 / WAV / M4A, 最大25MB)"
        accept="audio/*" file={audioFile} onFile={setAudioFile} required
      />

      <div style={{ height: 16 }} />

      <FileDrop
        label="背景画像 (任意 — JPG / PNG / WebP, 最大10MB)"
        accept="image/*" file={backgroundFile} onFile={setBackgroundFile}
      />

      <button
        onClick={onUpload} disabled={loading || !audioFile}
        style={{
          marginTop: 24, width: '100%', padding: '14px 20px',
          background: loading || !audioFile ? THEME.border : `linear-gradient(135deg, ${THEME.coral}, ${THEME.pink})`,
          color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
          cursor: loading || !audioFile ? 'not-allowed' : 'pointer', fontFamily: THEME.font,
        }}
      >
        {loading ? 'アップロード中…' : '次へ: 歌詞書き起こし →'}
      </button>
    </div>
  );
}

function FileDrop({ label, accept, file, onFile, required }) {
  const inputRef = useRef(null);
  return (
    <div>
      <div style={{ fontSize: 13, color: THEME.textSub, marginBottom: 6 }}>
        {label} {required && <span style={{ color: THEME.pink }}>*</span>}
      </div>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          padding: 20, border: `2px dashed ${file ? THEME.teal : THEME.border}`,
          borderRadius: 10, textAlign: 'center', cursor: 'pointer',
          background: file ? 'rgba(78, 205, 196, 0.06)' : 'transparent',
          transition: 'all 0.2s',
        }}
      >
        {file ? (
          <div>
            <div style={{ color: THEME.teal, fontWeight: 600, fontSize: 14 }}>✓ {file.name}</div>
            <div style={{ color: THEME.textMuted, fontSize: 12, marginTop: 4 }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB — クリックで変更
            </div>
          </div>
        ) : (
          <div style={{ color: THEME.textMuted, fontSize: 13 }}>クリックしてファイルを選択</div>
        )}
        <input
          ref={inputRef} type="file" accept={accept}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}

function StepTranscribe({ language, setLanguage, onTranscribe, loading, audioUrl }) {
  return (
    <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 24 }}>
      <h2 style={{ fontFamily: THEME.fontHead, fontSize: 20, margin: '0 0 16px 0' }}>ステップ 2: AI歌詞書き起こし</h2>
      <p style={{ color: THEME.textSub, fontSize: 14, marginBottom: 20 }}>
        OpenAI Whisper APIで歌詞を自動書き起こしします（30秒〜1分程度）
      </p>

      <audio src={audioUrl} controls style={{ width: '100%', marginBottom: 20 }} />

      <label style={{ display: 'block', fontSize: 13, color: THEME.textSub, marginBottom: 6 }}>言語</label>
      <select
        value={language} onChange={(e) => setLanguage(e.target.value)}
        style={{ width: '100%', padding: 12, background: THEME.bg, border: `1px solid ${THEME.border}`, borderRadius: 8, color: THEME.text, fontSize: 14, fontFamily: THEME.font, marginBottom: 20 }}
      >
        <option value="ja">日本語</option>
        <option value="en">English</option>
        <option value="ko">한국어</option>
        <option value="zh">中文</option>
      </select>

      <button
        onClick={onTranscribe} disabled={loading}
        style={{
          width: '100%', padding: '14px 20px',
          background: loading ? THEME.border : `linear-gradient(135deg, ${THEME.purple}, ${THEME.teal})`,
          color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: THEME.font,
        }}
      >
        {loading ? '書き起こし中…（時間がかかります）' : '歌詞を書き起こす 🎤'}
      </button>
    </div>
  );
}

function StepPreview(props) {
  const {
    canvasRef, audioRef, audioUrl,
    selectedTemplate, setSelectedTemplate,
    selectedAnimation, setSelectedAnimation,
    aspectRatio, setAspectRatio,
    segments, updateSegmentText,
    isPlaying, togglePlayback,
    currentTime, duration,
    onExport, isExporting, exportProgress,
  } = props;

  return (
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      {/* Canvas preview */}
      <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 20 }}>
        <h2 style={{ fontFamily: THEME.fontHead, fontSize: 20, margin: '0 0 16px 0' }}>プレビュー</h2>
        <div style={{ background: '#000', borderRadius: 10, overflow: 'hidden', display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <canvas
            ref={canvasRef}
            style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block' }}
          />
        </div>
        <audio ref={audioRef} src={audioUrl} style={{ width: '100%' }} crossOrigin="anonymous" />
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <button onClick={togglePlayback} disabled={isExporting} style={primaryBtn(isExporting)}>
            {isPlaying ? '⏸ 一時停止' : '▶ 再生'}
          </button>
          <span style={{ color: THEME.textSub, fontSize: 13, alignSelf: 'center' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 20 }}>
        <h3 style={{ fontFamily: THEME.fontHead, fontSize: 16, margin: '0 0 12px 0' }}>テンプレート</h3>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', marginBottom: 20 }}>
          {Object.entries(TEMPLATES).map(([key, tmpl]) => (
            <button
              key={key}
              onClick={() => setSelectedTemplate(key)}
              style={{
                padding: 12, borderRadius: 10,
                background: selectedTemplate === key ? `linear-gradient(135deg, ${THEME.coral}20, ${THEME.pink}20)` : THEME.bg,
                border: `1.5px solid ${selectedTemplate === key ? THEME.coral : THEME.border}`,
                color: THEME.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: THEME.font, textAlign: 'left',
              }}
            >
              <div>{tmpl.nameJa}</div>
              <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 4 }}>{tmpl.name}</div>
            </button>
          ))}
        </div>

        <h3 style={{ fontFamily: THEME.fontHead, fontSize: 16, margin: '0 0 12px 0' }}>アニメーション</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {Object.entries(ANIMATIONS).map(([key, anim]) => (
            <button
              key={key} onClick={() => setSelectedAnimation(key)}
              style={{
                padding: '8px 14px', borderRadius: 9999,
                background: selectedAnimation === key ? THEME.purple : THEME.bg,
                border: `1px solid ${selectedAnimation === key ? THEME.purple : THEME.border}`,
                color: selectedAnimation === key ? '#fff' : THEME.text,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: THEME.font,
              }}
            >
              {anim.nameJa}
            </button>
          ))}
        </div>

        <h3 style={{ fontFamily: THEME.fontHead, fontSize: 16, margin: '0 0 12px 0' }}>アスペクト比</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['16:9', '9:16', '1:1'].map((ar) => (
            <button
              key={ar} onClick={() => setAspectRatio(ar)}
              style={{
                padding: '8px 16px', borderRadius: 9999,
                background: aspectRatio === ar ? THEME.teal : THEME.bg,
                border: `1px solid ${aspectRatio === ar ? THEME.teal : THEME.border}`,
                color: aspectRatio === ar ? '#000' : THEME.text,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: THEME.font,
              }}
            >
              {ar}
            </button>
          ))}
        </div>

        <button
          onClick={onExport} disabled={isExporting}
          style={{
            width: '100%', padding: '14px 20px',
            background: isExporting ? THEME.border : `linear-gradient(135deg, ${THEME.gold}, ${THEME.coral})`,
            color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
            cursor: isExporting ? 'not-allowed' : 'pointer', fontFamily: THEME.font,
          }}
        >
          {isExporting ? `エクスポート中… ${exportProgress}%` : 'WebM でエクスポート 📥'}
        </button>

        {isExporting && (
          <div style={{ marginTop: 12, height: 6, background: THEME.border, borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${exportProgress}%`, background: `linear-gradient(90deg, ${THEME.coral}, ${THEME.pink})`, transition: 'width 0.3s' }} />
          </div>
        )}
      </div>

      {/* Lyrics editor */}
      <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 20 }}>
        <h3 style={{ fontFamily: THEME.fontHead, fontSize: 16, margin: '0 0 12px 0' }}>歌詞編集 ({segments.length} 行)</h3>
        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {segments.map((seg, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: THEME.textMuted, fontSize: 11, minWidth: 80, fontVariantNumeric: 'tabular-nums' }}>
                {formatTime(seg.start)} → {formatTime(seg.end)}
              </span>
              <input
                type="text" value={seg.text}
                onChange={(e) => updateSegmentText(idx, e.target.value)}
                style={{ flex: 1, padding: '8px 12px', background: THEME.bg, border: `1px solid ${THEME.border}`, borderRadius: 8, color: THEME.text, fontSize: 13, fontFamily: THEME.font }}
              />
            </div>
          ))}
          {segments.length === 0 && (
            <div style={{ color: THEME.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>
              歌詞がありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function primaryBtn(disabled) {
  return {
    padding: '10px 20px',
    background: disabled ? THEME.border : `linear-gradient(135deg, ${THEME.coral}, ${THEME.pink})`,
    color: '#fff', border: 'none', borderRadius: 9999, fontSize: 14, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: THEME.font,
  };
}

function formatTime(sec) {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Direct PUT upload to a Supabase Storage signed URL.
// Uses multipart body with cacheControl + file — matches the Supabase JS client's
// uploadToSignedUrl protocol. safeName overrides the multipart filename with an
// ASCII-only string to avoid Content-Disposition filename validation errors.
async function directUpload(signedUrl, file, safeName) {
  const form = new FormData();
  form.append('cacheControl', '3600');
  form.append('', file, safeName);
  const res = await fetch(signedUrl, {
    method: 'PUT',
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Storage upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

export default function LyricVideoPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: THEME.bg, color: THEME.text, padding: 24 }}>Loading…</div>}>
      <LyricVideoEditor />
    </Suspense>
  );
}
