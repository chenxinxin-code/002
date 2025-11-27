import React from 'react';

interface LightboxProps {
  imageUrl: string;
  altText: string;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ imageUrl, altText, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-10 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-black/50 rounded-full border border-white/10 transition-colors z-[101]"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      <img 
        src={imageUrl} 
        alt={altText}
        className="max-w-full max-h-full object-contain shadow-2xl rounded-sm select-none"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking image
      />
      
      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
        <p className="inline-block bg-black/60 px-4 py-2 rounded-full text-white text-sm backdrop-blur-md border border-white/10">
          {altText}
        </p>
      </div>
    </div>
  );
};

export default Lightbox;