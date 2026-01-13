import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProblemSection from './components/ProblemSection';
import SolutionSection from './components/SolutionSection';
import RoadmapSection from './components/RoadmapSection';
import TeamSection from './components/TeamSection';
import Footer from './components/Footer';
import Reveal from './components/Reveal';

function App() {
  return (
    <div className="bg-black min-h-screen text-gray-200 font-sans selection:bg-red-500 selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <RoadmapSection />
        <TeamSection />
        
        {/* Simple Contact Form Placeholder */}
        <section id="contact" className="py-20 bg-brand-gray relative">
          <div className="max-w-3xl mx-auto px-4">
            <Reveal y={40}>
              <div className="bg-black border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">Nous Contacter</h2>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Nom" className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-red-500 focus:outline-none transition-colors" />
                    <input type="email" placeholder="Email" className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-red-500 focus:outline-none transition-colors" />
                  </div>
                  <textarea placeholder="Message" rows={4} className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-red-500 focus:outline-none transition-colors"></textarea>
                  <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-red-600/20">
                    Envoyer
                  </button>
                </form>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default App;