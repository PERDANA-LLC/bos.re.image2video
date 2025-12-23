'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './ImageToVideo.module.css';

// Types
interface ImageItem {
  id: number;
  file: Blob | File;
  name: string;
  src: string;
  imgObject: HTMLImageElement;
}

interface Settings {
  duration: number;
  resolution: { w: number; h: number };
  addMusic: boolean;
}

const CINEMATIC_MUSIC_URL = "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=cinematic-atmosphere-11459.mp3";

export default function ImageToVideo() {
  // State
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({
    duration: 3,
    resolution: { w: 1920, h: 1080 },
    addMusic: false
  });
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

  // Refs
  const urlInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Toast
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Logic: Add Image
  const addImageToState = (fileName: string, dataBlobOrFile: Blob | File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      const src = e.target.result as string;
      const img = new Image();
      img.onload = () => {
        setImages(prev => [...prev, {
          id: Date.now() + Math.random(),
          file: dataBlobOrFile,
          name: fileName,
          src,
          imgObject: img
        }]);
      };
      img.src = src;
    };
    reader.readAsDataURL(dataBlobOrFile);
  };

  // Handlers
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    let addedCount = 0;
    Array.from(files).forEach(file => {
      if (file.type === 'application/pdf') {
        showToast(`Skipped PDF: "${file.name}". Please convert to Image first.`, 'error');
        return;
      }
      if (validTypes.includes(file.type)) {
        addImageToState(file.name, file);
        addedCount++;
      } else {
        showToast(`Skipped "${file.name}": Invalid format.`, 'error');
      }
    });
    if (addedCount > 0) showToast(`Added ${addedCount} images.`, 'success');
  };

  const handleUrlUpload = async () => {
    if (!urlInputRef.current) return;
    const url = urlInputRef.current.value.trim();
    if (!url) { showToast("Please enter a URL", "error"); return; }
    
    try {
      new URL(url);
    } catch { showToast("Invalid URL format", "error"); return; }

    // heuristic: check for likely webpage URLs
    if (!url.match(/\.(jpeg|jpg|gif|png|webp|avif|bmp|svg)$/i) && !url.includes('images') && (url.includes('zillow.com') || url.includes('airbnb.com') || !url.includes('.'))) {
        showToast("Link might be a webpage, not an image. Right-click image -> Copy Image Address", "info");
        // We continue anyway just in case, but warn first
    }

    try {
      // Use our proxy to bypass CORS
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        // Try to parse error text
        const errText = await response.text().catch(() => response.statusText);
        if (response.status === 403) {
             throw new Error("Access Denied (403). Website blocks bots. Please download image and upload manually.");
        }
        throw new Error(`Failed to load: ${response.status} - ${errText}`);
      }
      
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw new Error("URL does not point to an image.");
      
      const fileName = url.split('/').pop() || 'web-image.jpg';
      addImageToState(fileName, blob);
      urlInputRef.current.value = "";
      showToast("Image added from URL", "success");
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Failed to load URL";
      showToast(msg.length > 50 ? msg.substring(0, 50) + "..." : msg, "error");
    }
  };

  const removeImage = (id: number) => {
    if (isGenerating) return;
    setImages(prev => prev.filter(img => img.id !== id));
  };

  // Logic: Generation
  const startGeneration = async () => {
    if (images.length < 2) { showToast("Please add at least 2 images.", "error"); return; }
    if (isGenerating) return;

    setIsGenerating(true);
    setProgress(0);
    setVideoUrl(null);

    const { w, h } = settings.resolution;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Stream & Audio Setup
    const stream = canvas.captureStream(30);
    let audioContext: AudioContext | null = null;
    let musicElement: HTMLAudioElement | null = null;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioCtx();
      const dest = audioContext.createMediaStreamDestination();

      if (settings.addMusic) {
        musicElement = new Audio(CINEMATIC_MUSIC_URL);
        musicElement.crossOrigin = "anonymous";
        musicElement.loop = true;
        musicElement.volume = 0.4;
        
        await musicElement.play(); 

        const source = audioContext.createMediaElementSource(musicElement);
        const gain = audioContext.createGain();
        source.connect(gain);
        gain.connect(dest);
        gain.connect(audioContext.destination); 
      } else {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
      }

      if (dest.stream.getAudioTracks().length > 0) {
        stream.addTrack(dest.stream.getAudioTracks()[0]);
      }
    } catch (e) {
      console.error("Audio init failed", e);
      showToast("Audio initialization failed, continuing silent.", "error");
    }

    // Recorder
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
    
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    
    recorder.onstop = () => {
      if (musicElement) { musicElement.pause(); }
      if (audioContext) { audioContext.close(); }
      
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsGenerating(false);
      showToast("Video generated successfully!", "success");
    };

    recorder.start();

    // Animation Loop
    const transitionDuration = 1.0;
    const holdDuration = settings.duration;
    const fps = 30;
    const totalFrames = images.length * (holdDuration + transitionDuration) * fps;
    let currentFrame = 0;

    const drawImageCover = (img: HTMLImageElement, offsetX = 0, offsetY = 0, scale = 1) => {
        const canvasRatio = w / h;
        const imgRatio = img.width / img.height;
        let renderW, renderH;
        if (imgRatio > canvasRatio) { renderH = h; renderW = h * imgRatio; } 
        else { renderW = w; renderH = w / imgRatio; }
        const centerX = w / 2; const centerY = h / 2;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);
        ctx.drawImage(img, centerX - renderW / 2 + offsetX, centerY - renderH / 2 + offsetY, renderW, renderH);
        ctx.restore();
    };

    // Async loop
    for (let i = 0; i < images.length; i++) {
        const currentImg = images[i].imgObject;
        const nextImg = images[(i + 1) % images.length].imgObject;
        const motion = { scaleStart: 1.0, scaleEnd: 1.08, panX: (Math.random() - 0.5) * 40, panY: (Math.random() - 0.5) * 40 };

        // Hold
        const holdFrames = holdDuration * fps;
        for (let f = 0; f < holdFrames; f++) {
            const progress = f / holdFrames;
            const scale = motion.scaleStart + (motion.scaleEnd - motion.scaleStart) * progress;
            const offX = motion.panX * progress;
            const offY = motion.panY * progress;
            ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
            drawImageCover(currentImg, offX, offY, scale);
            currentFrame++;
            if (currentFrame % 5 === 0) setProgress(Math.min(100, Math.round((currentFrame/totalFrames)*100)));
            await new Promise(r => setTimeout(r, 1000 / fps));
        }

        // Transition
        if (i < images.length - 1) {
            const transFrames = transitionDuration * fps;
            const transType = Math.floor(Math.random() * 3);
            const nextMotion = { scaleStart: 1.0, scaleEnd: 1.08, panX: (Math.random() - 0.5) * 40, panY: (Math.random() - 0.5) * 40 };
            
            for (let f = 0; f < transFrames; f++) {
                const progress = f / transFrames;
                const ease = (t: number) => t * (2 - t);
                ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
                
                // Draw Current
                if (transType === 0) { ctx.globalAlpha = 1 - ease(progress); drawImageCover(currentImg, motion.panX, motion.panY, motion.scaleEnd); }
                else if (transType === 1) { drawImageCover(currentImg, motion.panX - (ease(progress)*w), motion.panY, motion.scaleEnd); }
                else if (transType === 2) { ctx.globalAlpha = 1 - ease(progress); drawImageCover(currentImg, motion.panX, motion.panY, motion.scaleEnd + 0.2); }

                // Draw Next
                if (transType === 0) { ctx.globalAlpha = ease(progress); drawImageCover(nextImg, 0, 0, nextMotion.scaleStart); }
                else if (transType === 1) { drawImageCover(nextImg, nextMotion.panX + (w - ease(progress)*w), nextMotion.panY, nextMotion.scaleStart); }
                else if (transType === 2) { ctx.globalAlpha = ease(progress); drawImageCover(nextImg, 0, 0, nextMotion.scaleStart + 0.2); }

                ctx.globalAlpha = 1.0;
                currentFrame++;
                if (currentFrame % 5 === 0) setProgress(Math.min(100, Math.round((currentFrame/totalFrames)*100)));
                await new Promise(r => setTimeout(r, 1000 / fps));
            }
        }
    }
    recorder.stop();
  };

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {/* Toast */}
      {toast && (
         <div className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`}>
             {toast.msg}
         </div>
      )}

      {/* Upload Section */}
      <section className={`${styles.uploadSection} animate-fade-in`}>
        <div className={styles.sectionHeader}>
            <span className={styles.stepNumber}>1</span>
            Import Media
        </div>
        
        {/* URL Input */}
        <div className={styles.urlInputGroup}>
            <input 
                ref={urlInputRef}
                type="text" 
                placeholder="Paste image URL (https://...)" 
                className={styles.input}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlUpload()}
            />
            <button onClick={handleUrlUpload} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                Add URL
            </button>
        </div>

        {/* Drop Zone */}
        <div 
            className={styles.dropZone}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add(styles.dragOver); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove(styles.dragOver); }}
            onDrop={(e) => { 
                e.preventDefault(); 
                e.currentTarget.classList.remove(styles.dragOver);
                handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
        >
            <div className={styles.uploadIcon}>
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
            </div>
            <p style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.25rem' }}>Click to upload or drag & drop</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>JPG, PNG, WebP supported</p>
            <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
        </div>
      </section>

      {/* Workspace */}
      <main className={styles.workspace}>
        
        {/* Left: Preview Grid */}
        <div className={`${styles.previewPanel} animate-fade-in`} style={{ animationDelay: '0.1s' }}>
            <div className={styles.panelHeader}>
                <div className={styles.sectionHeader} style={{ marginBottom: 0 }}>
                    <span className={styles.stepNumber} style={{ background: 'rgba(192, 132, 252, 0.2)', color: '#c084fc' }}>2</span>
                    Timeline ({images.length})
                </div>
                {images.length > 0 && (
                    <button onClick={() => { if(!isGenerating) setImages([]); }} className={styles.clearBtn}>
                        Clear All
                    </button>
                )}
            </div>

            <div className={`${styles.imageGrid} custom-scrollbar`}>
                {images.map(img => (
                    <div key={img.id} className={styles.imageCard}>
                        <img src={img.src} alt={img.name} />
                        <button 
                            onClick={() => removeImage(img.id)}
                            className={styles.removeBtn}
                        >
                            ×
                        </button>
                    </div>
                ))}
                {images.length === 0 && (
                     <div className={styles.emptyState}>
                         No images select yet.
                     </div>
                )}
            </div>

            {/* Generation Status */}
            {isGenerating && (
                <div className={styles.progressContainer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        <span>Rendering Video...</span>
                        <span>{progress}%</span>
                    </div>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}

            {/* Video Result */}
            {videoUrl && !isGenerating && (
                <div className={styles.resultArea}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--success)' }}>Video Ready!</h3>
                    <video controls src={videoUrl} className={styles.video}></video>
                    <a href={videoUrl} download="cinematic-video.webm" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none' }}>
                        Download Video
                    </a>
                </div>
            )}
        </div>

        {/* Right: Settings */}
        <aside className={`${styles.settingsPanel} animate-fade-in`} style={{ animationDelay: '0.2s', height: 'fit-content' }}>
            <div className={styles.sectionHeader}>
                <span className={styles.stepNumber} style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>3</span>
                Settings
            </div>

            <div className={styles.settingsStack}>
                <div>
                    <label className={styles.settingLabel}>Duration per Image</label>
                    <div className={styles.rangeWrapper}>
                        <input 
                            type="range" 
                            min="1" max="10" step="0.5" 
                            value={settings.duration}
                            onChange={(e) => setSettings(s => ({ ...s, duration: parseFloat(e.target.value) }))}
                            style={{ flex: 1 }}
                        />
                        <span className={styles.rangeValue}>{settings.duration}s</span>
                    </div>
                </div>

                <div>
                    <label className={styles.settingLabel}>Resolution</label>
                    <select 
                        value={`${settings.resolution.w}x${settings.resolution.h}`}
                        onChange={(e) => {
                             const [w, h] = e.target.value.split('x').map(Number);
                             setSettings(s => ({ ...s, resolution: { w, h } }));
                        }}
                        className={styles.input}
                        style={{ width: '100%' }}
                    >
                        <option value="1280x720">720p (HD)</option>
                        <option value="1920x1080">1080p (FHD)</option>
                    </select>
                </div>

                <div className={styles.checkboxCard} onClick={() => setSettings(s => ({ ...s, addMusic: !s.addMusic }))}>
                    <input 
                        type="checkbox" 
                        checked={settings.addMusic} 
                        onChange={() => {}} // Handled by parent click
                    />
                    <div>
                        <div style={{ fontWeight: 500 }}>Cinematic Music</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Adds ambient background track</div>
                    </div>
                </div>

                <button 
                    onClick={startGeneration} 
                    disabled={isGenerating || images.length < 2}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '1rem' }}
                >
                    {isGenerating ? 'Generating...' : 'Generate Video'}
                </button>
            </div>
        </aside>

      </main>
    </div>
  );
}
