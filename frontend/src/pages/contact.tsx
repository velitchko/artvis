import * as React from 'react';
import NavigationComponent from '../components/navigation/navigation';
import FooterComponent from '../components/footer/footer';
import ParticlesTransparentComponent from '../components/particles/particles-transparent';

const ContactPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50 relative overflow-hidden">
    <div className="absolute inset-0 z-0">
      <ParticlesTransparentComponent />
    </div>
    <div className="relative z-10">
      <NavigationComponent showHeading={true} />
      <div className="max-w-2xl mx-auto px-6 py-12 relative z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Contact</h1>
          <div className="prose prose-md max-w-none text-gray-800">
            <p>If you have questions, feedback, or collaboration ideas, please get in touch with any of the project team members:</p>
            <ul>
              <li><strong>Silvia Miksch</strong> (Project Lead) – <a href="mailto:silvia.miksch@tuwien.ac.at" className="text-blue-600 underline">silvia.miksch@tuwien.ac.at</a></li>
              <li><strong>Velitchko Filipov</strong> – <a href="mailto:velitchko.filipov@tuwien.ac.at" className="text-blue-600 underline">velitchko.filipov@tuwien.ac.at</a></li>
              <li><strong>Michaela Tuscher</strong> – <a href="mailto:michaela.tuscher@tuwien.ac.at" className="text-blue-600 underline">michaela.tuscher@tuwien.ac.at</a></li>
              <li><strong>Raphael Rosenberg</strong> – <a href="mailto:raphael.rosenberg@univie.ac.at" className="text-blue-600 underline">raphael.rosenberg@univie.ac.at</a></li>
              <li><strong>Teresa Kamencek</strong> – <a href="mailto:teresa.kamencek@univie.ac.at" className="text-blue-600 underline">teresa.kamencek@univie.ac.at</a></li>
            </ul>
            <p className="mt-4"><strong>Website:</strong> <a href="https://cvast.tuwien.ac.at/projects/artvis" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">https://cvast.tuwien.ac.at/projects/artvis</a></p>
          </div>
        </div>
      </div>
      <FooterComponent />
    </div>
  </div>
);

export default ContactPage;
