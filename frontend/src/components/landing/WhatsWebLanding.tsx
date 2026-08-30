export const displayName = 'WhatsWeb Landing Page';
export const screenSize = 'desktop';

import NavBar from './NavBar';
import HeroSection from './HeroSection';
import StatsSection from './StatsSection';
import ProblemSolutionSection from './ProblemSolutionSection';
import FeaturesSection from './FeaturesSection';
import HowItWorksSection from './HowItWorksSection';
import UseCasesSection from './UseCasesSection';
import WhyChooseSection from './WhyChooseSection';
import AdvancedFeaturesSection from './AdvancedFeaturesSection';
import TestimonialsSection from './TestimonialsSection';
import IntegrationsSection from './IntegrationsSection';
import SecuritySection from './SecuritySection';
import FAQSection from './FAQSection';
import CTASection from './CTASection';
import Footer from './Footer';

export default function WhatsWebLanding() { return (
  <div className="bg-background font-body">
    <NavBar />
    <HeroSection />
    <StatsSection />
    <ProblemSolutionSection />
    <FeaturesSection />
    <HowItWorksSection />
    <UseCasesSection />
    <WhyChooseSection />
    <AdvancedFeaturesSection />
    <TestimonialsSection />
    <IntegrationsSection />
    <SecuritySection />
    <FAQSection />
    <CTASection />
    <Footer />
  </div>
);}