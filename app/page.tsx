import ImageToVideo from "@/components/ImageToVideo";
import Infographic from "@/components/Infographic";

export default function Home() {
  return (
    <div className="min-h-screen py-12 px-4 md:px-8">
      <header className="text-center mb-12 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 title-gradient" style={{ fontSize: '2.5rem', fontWeight: 800 }}>
          Cinematic Image to Video
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
          Transform your photos into stunning cinematic videos with Pan & Zoom effects, transitions, and immersive audio.
        </p>
      </header>
      
      <Infographic />
      <ImageToVideo />
    </div>
  );
}
